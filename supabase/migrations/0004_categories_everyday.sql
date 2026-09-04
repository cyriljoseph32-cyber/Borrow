-- Borrow — catégorie générique "tout objet du quotidien" (perceuse, échelle,
-- projecteur…), pour ne pas laisser croire que Borrow ne sert qu'à la plongée.

insert into public.categories (slug, name_en, name_th, accepts, requires_review, sort_order) values
  ('everyday', 'Everyday & tools', 'ของใช้ในบ้าน', '{item}', false, 45)
on conflict (slug) do nothing;

insert into public.categories (parent_id, slug, name_en, accepts, requires_review, sort_order)
select c.id, v.slug, v.name_en, v.accepts::listing_kind[], v.requires_review, v.sort_order
from (values
  ('everyday', 'everyday-tools',       'Tools & DIY',          '{item}', false, 46),
  ('everyday', 'everyday-electronics', 'Electronics & AV',     '{item}', false, 47)
) as v(parent_slug, slug, name_en, accepts, requires_review, sort_order)
join public.categories c on c.slug = v.parent_slug
on conflict (slug) do nothing;
