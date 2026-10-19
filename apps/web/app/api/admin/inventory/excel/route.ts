import {isAdmin,sameOrigin} from '@/lib/admin-auth';
import ExcelJS from 'exceljs';
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'No autorizado'},{status:401});
 if(!sameOrigin(request))return Response.json({error:'Origen no autorizado'},{status:403});
 const body=await request.json().catch(()=>null);
 if(!Array.isArray(body?.rows)||body.rows.length>10000)return Response.json({error:'Datos inválidos'},{status:400});
 const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Inventario');
 ws.columns=[{header:'variant_id',key:'id',width:40},{header:'Código',key:'code',width:20},{header:'Producto',key:'name',width:35},{header:'Color',key:'color',width:20},{header:'Talle',key:'size',width:14},{header:'Stock',key:'stock',width:14}];
 for(const row of body.rows)ws.addRow({id:String(row.id),code:String(row.code),name:String(row.name),color:String(row.color),size:String(row.size),stock:Number(row.stock)});
 ws.getRow(1).font={bold:true};
 const buf=await wb.xlsx.writeBuffer();
 return new Response(buf as BodyInit,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="inventario.xlsx"'}});
}
