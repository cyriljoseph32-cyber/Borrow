-- Borrow — catégories de la niche pilote (Koh Samui : sport, mer, loisirs)
-- `requires_review = true` ⇒ les annonces de SERVICE de cette catégorie passent
-- en validation admin avant publication (activités encadrées).

insert into public.categories (slug, name_en, name_th, accepts, requires_review, sort_order) values
  ('diving',        'Diving & freediving',      'ดำน้ำ',            '{item,service}', true,  10),
  ('underwater',    'Underwater photo & video', 'ถ่ายภาพใต้น้ำ',      '{item,service}', false, 20),
  ('watersports',   'Watersports',              'กีฬาทางน้ำ',        '{item,service}', true,  30),
  ('rugby',         'Rugby & team sports',      'รักบี้',            '{item,service}', true,  40),
  ('fitness',       'Fitness & movement',       'ฟิตเนส',            '{item,service}', true,  50),
  ('mobility',      'Mobility',                 'การเดินทาง',        '{item}',         false, 60),
  ('family',        'Family & travel gear',     'อุปกรณ์ครอบครัว',    '{item}',         false, 70)
on conflict (slug) do nothing;

-- Sous-catégories
insert into public.categories (parent_id, slug, name_en, accepts, requires_review, sort_order)
select c.id, v.slug, v.name_en, v.accepts::listing_kind[], v.requires_review, v.sort_order
from (values
  ('diving',      'diving-gear',        'Dive gear',             '{item}',         false, 11),
  ('diving',      'diving-guided',      'Guided dives',          '{service}',      true,  12),
  ('diving',      'diving-courses',     'Courses & training',    '{service}',      true,  13),
  ('underwater',  'uw-cameras',         'Cameras & housings',    '{item}',         false, 21),
  ('underwater',  'uw-lighting',        'Lighting & accessories','{item}',         false, 22),
  ('underwater',  'uw-shooting',        'Shooting & editing',    '{service}',      false, 23),
  ('watersports', 'ws-paddle',          'Paddle & kayak',        '{item}',         false, 31),
  ('watersports', 'ws-surf',            'Surf & wing',           '{item}',         false, 32),
  ('watersports', 'ws-lessons',         'Lessons & guiding',     '{service}',      true,  33),
  ('rugby',       'rugby-gear',         'Training gear',         '{item}',         false, 41),
  ('rugby',       'rugby-coaching',     'Coaching',              '{service}',      true,  42),
  ('fitness',     'fitness-gear',       'Equipment',             '{item}',         false, 51),
  ('fitness',     'fitness-sessions',   'Sessions & classes',    '{service}',      true,  52),
  ('mobility',    'mobility-bikes',     'Bikes & scooters',      '{item}',         false, 61),
  ('family',      'family-baby',        'Baby & toddler gear',   '{item}',         false, 71),
  ('family',      'family-camping',     'Camping & hiking',      '{item}',         false, 72)
) as v(parent_slug, slug, name_en, accepts, requires_review, sort_order)
join public.categories c on c.slug = v.parent_slug
on conflict (slug) do nothing;
