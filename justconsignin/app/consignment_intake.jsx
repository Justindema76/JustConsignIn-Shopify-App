import {useEffect,useMemo,useState} from 'react';
import {Check,X} from 'lucide-react';
import AppNavigation from './ui/AppNavigation';
import ShopifyUiStyles from './ui/ShopifyUiStyles';
import DashboardPage from './ui/pages/DashboardPage';
import ConsignorsPage from './ui/pages/ConsignorsPage';
import ConsignorDetailsPage from './ui/pages/ConsignorDetailsPage';
import EditConsignorPage from './ui/pages/EditConsignorPage';
import ItemsPage from './ui/pages/ItemsPage';
import SalesPage from './ui/pages/SalesPage';
import PayoutsPage from './ui/pages/PayoutsPage';
import AddItemPage from './ui/pages/AddItemPage';
import ItemDetailsPage from './ui/pages/ItemDetailsPage';
import MarkSoldPage from './ui/pages/MarkSoldPage';
import NewConsignorPage from './ui/pages/NewConsignorPage';
import CreatePayoutPage from './ui/pages/CreatePayoutPage';
import TransactionsPage from './ui/pages/TransactionsPage';
import ReportsPage from './ui/pages/ReportsPage';
import ImportExportPage from './ui/pages/ImportExportPage';
import SettingsPage from './ui/pages/SettingsPage';
import {createConsignor,createConsignmentItems,deleteConsignor,deleteConsignmentItem,getConsignmentData,importConsignmentData,recordConsignorPayout,syncShopifyProduct,updateConsignor,updateConsignmentItem,updateConsignmentItemStatus} from './consignmentApi';

export default function ConsignmentIntakeApp(){
 const[ready,setReady]=useState(false);const[view,setView]=useState('dashboard');const[consignors,setConsignors]=useState([]);const[items,setItems]=useState([]);const[activeConsignorId,setActiveConsignorId]=useState('');const[activeItemId,setActiveItemId]=useState('');const[prefillConsignorId,setPrefillConsignorId]=useState('');const[toast,setToast]=useState('');const[error,setError]=useState('');
 const activeConsignor=useMemo(()=>consignors.find(c=>c.id===activeConsignorId),[consignors,activeConsignorId]);const activeItem=useMemo(()=>items.find(i=>i.id===activeItemId),[items,activeItemId]);
 async function refresh(){const data=await getConsignmentData();setConsignors(data.consignors||[]);setItems(data.items||[]);return data}
 useEffect(()=>{refresh().catch(e=>setError(e.message||'Could not load Shopify data')).finally(()=>setReady(true))},[]);
 function flash(message){setToast(message);setTimeout(()=>setToast(''),2200)}
 function fail(e,fallback){setError(e?.message||fallback);setTimeout(()=>setError(''),5000)}
 function navigate(next){setView(next);window.scrollTo({top:0,behavior:'auto'})}
 function openConsignor(id){setActiveConsignorId(id);navigate('consignor')}
 function openItem(id){const item=items.find(x=>x.id===id);setActiveItemId(id);if(item?.consignorId)setActiveConsignorId(item.consignorId);navigate('item')}
 function startNewItem(consignorId=''){setPrefillConsignorId(consignorId);navigate('addItem')}
 async function saveConsignor(form){try{const saved=await createConsignor(form);await refresh();flash(`Consignor #${saved.number} added`);setActiveConsignorId(saved.id);navigate('consignor')}catch(e){fail(e,'Could not save consignor');throw e}}
 async function saveConsignorChanges(id,form){try{await updateConsignor(id,form);await refresh();flash('Consignor updated');setActiveConsignorId(id);navigate('consignor')}catch(e){fail(e,'Could not update consignor');throw e}}
 async function removeConsignor(id){if(!window.confirm('Delete this consignor? Linked items must be removed first.'))return;try{await deleteConsignor(id);await refresh();flash('Consignor deleted');setActiveConsignorId('');navigate('consignors')}catch(e){fail(e,'Could not delete consignor')}}
 async function saveItem(consignorId,form,shopify){try{const saved=await createConsignmentItems(consignorId,[form]);const item=saved[0];if(shopify.enabled){await syncShopifyProduct(item.id,{...shopify,shopifyPrice:shopify.shopifyPrice||form.price});}await refresh();flash(shopify.enabled?'Item saved and Shopify product created':'Item saved');setActiveConsignorId(consignorId);navigate('consignor')}catch(e){fail(e,'Could not save item');throw e}}
 async function saveItemChanges(id,form){try{await updateConsignmentItem(id,form);await refresh();flash('Item updated')}catch(e){fail(e,'Could not update item');throw e}}
 async function syncProduct(id,product){try{await syncShopifyProduct(id,product);await refresh();flash('Shopify product synced')}catch(e){fail(e,'Could not sync Shopify product');throw e}}
 async function deleteItem(id){if(!window.confirm('Delete this consignment item and any linked Shopify product?'))return;try{await deleteConsignmentItem(id);await refresh();flash('Item deleted');navigate(activeConsignorId?'consignor':'items')}catch(e){fail(e,'Could not delete item')}}
 function startMarkSold(item){setActiveItemId(item.id);if(item.consignorId)setActiveConsignorId(item.consignorId);navigate('markSold')}
 async function saveSale(itemId,salePrice,dateSold){try{await updateConsignmentItemStatus(itemId,'Sold',{salePrice,dateSold});await refresh();flash('Item marked sold');navigate('sales')}catch(e){fail(e,'Could not mark item sold');throw e}}
 function startPayout(id){setActiveConsignorId(id);navigate('createPayout')}
 async function savePayout(payload){try{await recordConsignorPayout(payload);await refresh();flash('Payout recorded');navigate('payouts')}catch(e){fail(e,'Could not record payout');throw e}}
 async function runImport(kind,rows){try{const result=await importConsignmentData(kind,rows);await refresh();flash(`Imported ${result.itemsImported ?? result.imported ?? rows.length} record(s)`)}catch(e){fail(e,'Could not import CSV');throw e}}
 const navView=['dashboard','consignors','items','sales','payouts'].includes(view)?view:view==='consignor'||view==='editConsignor'||view==='newConsignor'?'consignors':view==='item'||view==='addItem'?'items':view==='markSold'?'sales':view==='createPayout'?'payouts':'dashboard';
 const nextNumber=Math.max(0,...consignors.map(c=>Number(c.number)||0))+1;
 return <div className="jci-app"><ShopifyUiStyles/>{ready&&<AppNavigation view={navView} onNavigate={navigate}/>} {toast&&<div className="jci-toast"><Check size={14}/> {toast}</div>}{error&&<div className="jci-error"><X size={14}/> {error}</div>}{!ready?<div className="jci-page jci-empty">Loading Shopify consignment data…</div>:<>
  {view==='dashboard'&&<DashboardPage consignors={consignors} items={items} onNavigate={navigate} onNewConsignor={()=>navigate('newConsignor')} onNewItem={()=>startNewItem()}/>} 
  {view==='consignors'&&<ConsignorsPage consignors={consignors} items={items} onOpen={openConsignor} onNew={()=>navigate('newConsignor')}/>} 
  {view==='consignor'&&activeConsignor&&<ConsignorDetailsPage consignor={activeConsignor} items={items} onBack={()=>navigate('consignors')} onEdit={()=>navigate('editConsignor')} onAddItem={()=>startNewItem(activeConsignor.id)} onOpenItem={openItem} onStartPayout={startPayout}/>} 
  {view==='editConsignor'&&activeConsignor&&<EditConsignorPage consignor={activeConsignor} onBack={()=>navigate('consignor')} onSave={saveConsignorChanges} onDelete={removeConsignor}/>} 
  {view==='items'&&<ItemsPage items={items} consignors={consignors} onOpenItem={openItem} onOpenConsignor={openConsignor} onNewItem={()=>startNewItem()}/>} 
  {view==='sales'&&<SalesPage items={items} consignors={consignors} onOpenConsignor={openConsignor} onStartPayout={startPayout}/>} 
  {view==='payouts'&&<PayoutsPage items={items} consignors={consignors} onOpenConsignor={openConsignor} onStartPayout={startPayout}/>} 
  {view==='newConsignor'&&<NewConsignorPage nextNumber={nextNumber} onBack={()=>navigate('consignors')} onSave={saveConsignor}/>} 
  {view==='addItem'&&<AddItemPage consignors={consignors} prefillConsignorId={prefillConsignorId} onBack={()=>navigate(prefillConsignorId?'consignor':'items')} onSave={saveItem}/>} 
  {view==='item'&&activeItem&&<ItemDetailsPage item={activeItem} onBack={()=>navigate(activeConsignorId?'consignor':'items')} onSave={saveItemChanges} onDelete={deleteItem} onSync={syncProduct} onMarkSold={startMarkSold}/>} 
  {view==='markSold'&&activeItem&&<MarkSoldPage item={activeItem} consignor={activeConsignor} onBack={()=>navigate('item')} onSave={saveSale}/>} 
  {view==='createPayout'&&activeConsignor&&<CreatePayoutPage consignor={activeConsignor} items={items} onBack={()=>navigate('payouts')} onSave={savePayout}/>} 
  {view==='transactions'&&<TransactionsPage items={items} consignors={consignors} onBack={()=>navigate('dashboard')}/>} 
  {view==='reports'&&<ReportsPage items={items} consignors={consignors} onBack={()=>navigate('dashboard')}/>} 
  {view==='importExport'&&<ImportExportPage consignors={consignors} items={items} onBack={()=>navigate('dashboard')} onImport={runImport}/>} 
  {view==='settings'&&<SettingsPage consignors={consignors} items={items} onBack={()=>navigate('dashboard')}/>} 
 </>}</div>
}
