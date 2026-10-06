import { createClient as createServiceClient } from '@supabase/supabase-js';
import fs from 'fs';
import { computeAll, mergeConfig, ROUNDING_OPTIONS } from '@/lib/calculator';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing env');
const supabase = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function toNum(v:any){ const n=Number(String(v).replace(',','.')); return Number.isFinite(n)?n:0; }
function round100(n:number){ if(n<=0) return 0; return Math.ceil(n/100)*100; }

async function main(){
  const csv = fs.readFileSync('/Users/sazofeifa/Documents/Odyss3D/Productos/Productos Odyss/productosO.csv','utf8');
  const lines = csv.split(/\r?\n/);
  const rows:any[] = [];
  for(let i=2;i<lines.length;i++){
    const line = lines[i]; if(!line.trim()) continue;
    const parts = line.split(';'); if(parts.length<5) continue;
    rows.push({ enlace:parts[0], nombre:parts[1], imagen:parts[2], gramos:toNum(parts[3]), minutos:toNum(parts[4]) });
  }
  const { data: calc } = await supabase.from('settings').select('value').eq('key','calculator_config').maybeSingle();
  const cfg = calc?.value?.config || {};
  const filamentPrice = calc?.value?.filamentPrice || 12000;
  const rollWeight = calc?.value?.rollWeight || 1000;

  const { data: colors } = await supabase.from('filament_colors').select('name').eq('is_active', true);
  const colorNames = (colors||[]).map((c:any)=>c.name).filter(Boolean);

  let ok=0; for(const r of rows){
    try{
      const t = computeAll({ hours:0, minutes:String(Math.round(r.minutos)), grams:String(r.gramos), quantity:'1', rounding:'none', filamentPrice, rollWeight }, mergeConfig(cfg));
      let cost = Math.max(t.costPerUnit, 400);
      let precioAntesIva = cost / (1 - t.margin);
      let sale = round100(precioAntesIva * 1.13);
      await supabase.from('products').upsert({
        name: r.nombre,
        category: 'Otro',
        is_active: true,
        is_ecommerce: true,
        print_minutes: Math.round(r.minutos),
        grams: r.gramos,
        production_cost: Math.round(cost),
        sale_price: sale,
        colors: colorNames,
        reference_url: r.enlace,
        image: null,
      }, { onConflict: 'name' });
      ok++;
    }catch(e){}
  }
  console.log(ok);
}
main();
