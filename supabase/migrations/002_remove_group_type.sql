-- Migration: remove group type column and auto-group creation from signup trigger

-- 1. type 컬럼 제거 (기존 personal/group 데이터는 의미 없으므로 그냥 DROP)
ALTER TABLE public.asset_groups DROP COLUMN IF EXISTS type;

-- 2. 신규 가입 트리거: 장부 자동생성 제거, profiles INSERT만 유지
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
