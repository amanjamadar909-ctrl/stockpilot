-- Duplicate update_updated_at() if not exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'supplier', 'purchase', 'sale')),
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Suppliers RLS policies
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Audit logs RLS policies
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Trigger to update updated_at for suppliers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to compute JSON diff
CREATE OR REPLACE FUNCTION compute_diff(old_json JSONB, new_json JSONB)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  key TEXT;
BEGIN
  IF old_json IS NULL AND new_json IS NOT NULL THEN
    RETURN new_json;
  END IF;
  
  IF new_json IS NULL AND old_json IS NOT NULL THEN
    RETURN old_json;
  END IF;
  
  IF old_json IS NULL OR new_json IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOR key IN SELECT jsonb_object_keys(new_json) LOOP
    IF old_json->>key IS DISTINCT FROM new_json->>key THEN
      result := result || jsonb_build_object(key, jsonb_build_object('old', old_json->>key, 'new', new_json->>key));
    END IF;
  END LOOP;
  
  FOR key IN SELECT jsonb_object_keys(old_json) LOOP
    IF new_json->>key IS NULL AND old_json->>key IS NOT NULL THEN
      result := result || jsonb_build_object(key, jsonb_build_object('old', old_json->>key, 'new', null));
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function for products
CREATE OR REPLACE FUNCTION audit_products()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, diff)
    VALUES (NEW.user_id, 'INSERT', 'product', NEW.id, to_jsonb(NEW), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, diff)
    VALUES (NEW.user_id, 'UPDATE', 'product', NEW.id, to_jsonb(OLD), to_jsonb(NEW), compute_diff(to_jsonb(OLD), to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, diff)
    VALUES (OLD.user_id, 'DELETE', 'product', OLD.id, to_jsonb(OLD), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function for suppliers
CREATE OR REPLACE FUNCTION audit_suppliers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, diff)
    VALUES (NEW.user_id, 'INSERT', 'supplier', NEW.id, to_jsonb(NEW), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, diff)
    VALUES (NEW.user_id, 'UPDATE', 'supplier', NEW.id, to_jsonb(OLD), to_jsonb(NEW), compute_diff(to_jsonb(OLD), to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, diff)
    VALUES (OLD.user_id, 'DELETE', 'supplier', OLD.id, to_jsonb(OLD), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function for purchases
CREATE OR REPLACE FUNCTION audit_purchases()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, diff)
    VALUES (NEW.user_id, 'INSERT', 'purchase', NEW.id, to_jsonb(NEW), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, diff)
    VALUES (OLD.user_id, 'DELETE', 'purchase', OLD.id, to_jsonb(OLD), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function for sales
CREATE OR REPLACE FUNCTION audit_sales()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, diff)
    VALUES (NEW.user_id, 'INSERT', 'sale', NEW.id, to_jsonb(NEW), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, diff)
    VALUES (OLD.user_id, 'DELETE', 'sale', OLD.id, to_jsonb(OLD), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_products();

CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_suppliers();

CREATE TRIGGER audit_purchases_trigger
  AFTER INSERT OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION audit_purchases();

CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_sales();