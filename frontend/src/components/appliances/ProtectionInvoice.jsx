import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { apiDownload } from '../../lib/apiClient';
import ApplianceDialog from './ApplianceDialog';
import PdfPreview from './PdfPreview';
export default function ProtectionInvoice({ checkoutKey }) {
 const [file,setFile]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(true),url=useRef(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(url.current)URL.revokeObjectURL(url.current);};},[]);
 async function open(){setBusy(true);setError('');try{const blob=await apiDownload(`/warranty-amc/checkouts/${checkoutKey}/invoice`);if(!alive.current)return;if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setFile({url:url.current,type:blob.type});}catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setBusy(false);}}
 function close(){setFile(null);if(url.current){URL.revokeObjectURL(url.current);url.current=null;}}
 return <><button disabled={busy} onClick={open} className="text-xs font-bold text-blue-800 underline">{busy?'Opening…':'View private invoice'}</button>{error&&<p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}{file&&<ApplianceDialog label="Protection invoice preview" onClose={close} className="max-w-4xl"><div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4"><h3 className="text-sm font-bold text-slate-900">Purchase invoice</h3><div className="flex gap-2"><a aria-label="Download protection invoice" href={file.url} download="purchase-invoice" className="p-2 text-blue-800"><Download size={20}/></a><button aria-label="Close protection invoice" onClick={close} className="p-2"><X size={20}/></button></div></div>{file.type.startsWith('image/')?<img alt="Purchase invoice" src={file.url} className="max-h-[75dvh] min-h-0 object-contain p-4"/>:<PdfPreview url={file.url}/>}</ApplianceDialog>}</>;
}
