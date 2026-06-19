-- ============================================================
-- AssetNavigator — Initial Schema
-- ============================================================

-- 1. profiles (auth.users와 1:1)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- 2. asset_groups (개인 가계부 or 계/모임)
CREATE TABLE IF NOT EXISTS public.asset_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'group')),
  created_by UUID        NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.asset_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_access" ON public.asset_groups
  FOR ALL USING (
    id IN (
      SELECT group_id FROM public.asset_group_members WHERE user_id = auth.uid()
    )
  );

-- 3. asset_group_members (장부-유저 다대다 + 역할)
CREATE TABLE IF NOT EXISTS public.asset_group_members (
  group_id  UUID        NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.asset_group_members ENABLE ROW LEVEL SECURITY;

-- 같은 장부 멤버끼리 서로 볼 수 있음
CREATE POLICY "member_see_members" ON public.asset_group_members
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members WHERE user_id = auth.uid()
    )
  );

-- 멤버 추가/수정/삭제는 owner만
CREATE POLICY "owner_manage_members" ON public.asset_group_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "owner_update_members" ON public.asset_group_members
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "owner_delete_members" ON public.asset_group_members
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 4. snapshots (장부에 귀속된 월별 스냅샷)
CREATE TABLE IF NOT EXISTS public.snapshots (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                  UUID         NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  snapshot_month            DATE         NOT NULL,
  data                      JSONB        NOT NULL DEFAULT '{}',
  -- 집계 메트릭 (목록/대시보드 빠른 읽기용)
  total_assets              INT          NOT NULL DEFAULT 0,
  total_liabilities         INT          NOT NULL DEFAULT 0,
  net_worth                 INT          NOT NULL DEFAULT 0,
  monthly_income            INT          NOT NULL DEFAULT 0,
  monthly_expenses          INT          NOT NULL DEFAULT 0,
  monthly_surplus           INT          NOT NULL DEFAULT 0,
  equity_ratio              NUMERIC(5,1) NOT NULL DEFAULT 0,
  household_balance         NUMERIC(5,1) NOT NULL DEFAULT 0,
  emergency_fund            NUMERIC(5,1) NOT NULL DEFAULT 0,
  annual_surplus            INT          NOT NULL DEFAULT 0,
  annual_savings            INT          NOT NULL DEFAULT 0,
  annual_asset_increase     INT          NOT NULL DEFAULT 0,
  projected_year_end_assets INT          NOT NULL DEFAULT 0,
  created_by                UUID         REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, snapshot_month)
);

CREATE INDEX ON public.snapshots (group_id, snapshot_month DESC);

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- 열람: 장부 멤버 전원
CREATE POLICY "members_read" ON public.snapshots
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members WHERE user_id = auth.uid()
    )
  );

-- 쓰기: owner 또는 editor
CREATE POLICY "editors_insert" ON public.snapshots
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "editors_update" ON public.snapshots
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "editors_delete" ON public.snapshots
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM public.asset_group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================================
-- 항목별 시계열 분석 VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.snapshot_entries_view AS
SELECT
  s.id             AS snapshot_id,
  s.group_id,
  s.snapshot_month,
  e.key            AS item_id,
  e.value->>'label'          AS label,
  e.value->>'category'       AS category,
  (e.value->>'amount')::int  AS amount
FROM public.snapshots s,
  jsonb_each(s.data) e;

-- ============================================================
-- 신규 가입 trigger: profiles + 기본 장부 + 멤버십 자동 생성
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE v_group_id UUID;
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);

  INSERT INTO public.asset_groups (name, type, created_by)
    VALUES ('내 자산', 'personal', NEW.id)
    RETURNING id INTO v_group_id;

  INSERT INTO public.asset_group_members (group_id, user_id, role)
    VALUES (v_group_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
