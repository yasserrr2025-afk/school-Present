CREATE TABLE IF NOT EXISTS canteen_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES students(student_id),
    student_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    class_name TEXT NOT NULL,
    daily_allowance NUMERIC NOT NULL DEFAULT 5.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canteen_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    settled_by UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false;

-- Add RLS Policies
ALTER TABLE canteen_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read on canteen_beneficiaries" ON canteen_beneficiaries FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on canteen_beneficiaries" ON canteen_beneficiaries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update on canteen_beneficiaries" ON canteen_beneficiaries FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all read on canteen_settlements" ON canteen_settlements FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on canteen_settlements" ON canteen_settlements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
