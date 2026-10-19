import {isAdmin,sameOrigin} from '@/lib/admin-auth';
import ExcelJS from 'exceljs';
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'No autorizado'},{status:401});
 if(!sameOrigin(request))return Response.json({error:'Origen no autorizado'},{status:403});
 const form=await request.formData();const file=form.get('file');
 if(!(file instanceof File)||file.size>2*1024*1024)return Response.json({error:'Elegí un Excel de hasta 2 MB'},{status:400});
 try{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
 const ws=wb.worksheets[0];if(!ws||ws.rowCount>5001)return Response.json({error:'El archivo excede 5000 filas'},{status:400});
 if(String(ws.getCell('A1').value)!=='variant_id'||String(ws.getCell('F1').value)!=='Stock')return Response.json({error:'Usá la plantilla exportada desde Inventario'},{status:400});
 const rows:{variant_id:string;stock:number}[]=[];
 for(let i=2;i<=ws.rowCount;i++){
 const id=String(ws.getCell(i,1).value??'').trim();const raw=ws.getCell(i,6).value;
 if(!id&&!raw)continue;
 const stock=Number(raw);
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)||!Number.isSafeInteger(stock)||stock<0||stock>1000000)return Response.json({error:`Fila ${i}: ID o stock inválido`},{status:400});
 rows.push({variant_id:id,stock});
 }
 if(!rows.length||new Set(rows.map(x=>x.variant_id)).size!==rows.length)return Response.json({error:'Archivo vacío o con variantes duplicadas'},{status:400});
 return Response.json({rows});
 }catch{return Response.json({error:'No se pudo leer el archivo Excel'},{status:400});}
}
