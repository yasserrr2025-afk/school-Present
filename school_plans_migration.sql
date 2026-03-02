-- Migration: Create school_plans table
CREATE TABLE IF NOT EXISTS public.school_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL UNIQUE, -- 'operational', 'learning_outcomes', 'discipline'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial records if not exists
INSERT INTO public.school_plans (type, title, content, is_public)
VALUES 
('operational', 'الخطة التشغيلية للمدرسة', '[]', false),
('learning_outcomes', 'خطة الرفع من نواتج التعلم', '[]', false),
('discipline', 'خطة الانضباط المدرسي', '[]', false)
ON CONFLICT (type) DO NOTHING;
