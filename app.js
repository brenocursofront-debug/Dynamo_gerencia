"use Strict";

// Catálogo fictício da demonstração: cada produto tem nome, preço e minutos financiados.
const PRODUTOS=[["Camiseta Dynamo Active",89.9,60],["Regata Pulse Dry",69.9,45],["Top Flow Support",79.9,50],["Camiseta Manga Longa UV50+",99.9,75],["Jaqueta Corta-Vento Shield",169.9,120],["Top Minimalist Cross",74.9,50],["Top Ribbed Performance",84.9,55],["Top Strappy Power",82.9,55],["Short Move 2 em 1",89.9,60],["Legging High Waist Fit",124.9,95],["Legging Seamless Flow",119.9,90],["Legging Training Power",129.9,100],["Short Training Mesh",79.9,50],["Bermuda Compressão Pro",82.9,55],["Calça Jogger Tech Training",139.9,100],["Bermuda Ciclista Ride",84.9,55],["Boné Dynamo Runner Aero",49.9,30],["Boné Trail Performance",54.9,35],["Mala Gym Duffle 35L",129.9,90],["Mochila Dynamo Tech 25L",149.9,110],["Garrafa Térmica Hydro 750ml",69.9,45],["Meia Compressão Marathon",39.9,25],["Kit Treino Elásticos e Cargas",89.9,60],["Viseira Ultraleve Trail",44.9,30]];
// Clientes fictícios e situações possíveis para os pedidos.
const CLIENTES=["Maria da Silva","João Pereira","Ana Souza"];
const STATUS=["pago","enviado","entregue","cancelado"];
// Chaves do navegador para guardar pedidos e manter a sessão nesta aba.
const CHAVE="dynamoAdminPedidos",SESSAO="dynamoAdminSessao";
const API="http://localhost:3000"; // mantido para referência; esta cópia usa apenas o modo demonstração
// Pedidos iniciais exibidos na primeira abertura do painel.
const exemplos=()=>[{id:1,cliente:0,data:"2026-11-10",status:"entregue",itens:[[0,1],[16,2]]},{id:2,cliente:1,data:"2026-11-18",status:"pago",itens:[[11,1]]},{id:3,cliente:0,data:"2026-11-21",status:"enviado",itens:[[4,1]]}];

// Esta versão usa o modo local: alterações ficam no armazenamento deste navegador.
let modo="local",token="",pedidos,filtro="todos",rascunho=[],lista=[],resumo={},catC=[],catP=[];
try{pedidos=JSON.parse(localStorage.getItem(CHAVE))}catch(e){}
if(!Array.isArray(pedidos))pedidos=exemplos();
const guardar=()=>{try{localStorage.setItem(CHAVE,JSON.stringify(pedidos))}catch(e){}};

const $=id=>document.getElementById(id);
const brl=n=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const cap=t=>t[0].toUpperCase()+t.slice(1);
const totalLocal=p=>p.itens.reduce((s,[i,q])=>s+PRODUTOS[i][1]*q,0);
const minutosLocal=p=>p.itens.reduce((s,[i,q])=>s+PRODUTOS[i][2]*q,0);
let tAviso;
function avisar(t){$("aviso").textContent=t;clearTimeout(tAviso);tAviso=setTimeout(()=>$("aviso").textContent="",6000)}

// ---------- Integração opcional com API ----------
// Funções mantidas para uma futura conexão com servidor; a apresentação atual usa modo local.
async function chamar(metodo,caminho,corpo){
  const r=await fetch(API+caminho,{method:metodo,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:corpo?JSON.stringify(corpo):undefined});
  let dados=null;try{dados=await r.json()}catch(e){}
  if(r.status===401&&token)sairPainel("Sua sessão expirou. Entre novamente.");
  return{ok:r.ok,status:r.status,dados};
}
const erroApi=r=>"Erro: "+((r.dados&&r.dados.erro)||"a API não respondeu como esperado.");

// ---------- Preparar dados para os indicadores e a tabela ----------
async function carregar(){
  if(modo==="api"){
    try{
      const [p,r]=await Promise.all([chamar("GET","/admin/pedidos"),chamar("GET","/admin/resumo")]);
      if(!p.ok||!r.ok){avisar(erroApi(p.ok?r:p));return}
      lista=p.dados.map(x=>({id:x.id,cliente:x.cliente,data:new Date(x.data_pedido).toLocaleDateString("pt-BR"),status:x.status,itens:x.itens,total:Number(x.total)}));
      resumo=r.dados;
    }catch(e){avisar("Erro: não consegui falar com a API. Ela está ligada?");return}
  }else{
    lista=pedidos.map(p=>({id:p.id,cliente:CLIENTES[p.cliente],data:p.data.split("-").reverse().join("/"),status:p.status,itens:p.itens.map(([i,q])=>q+"× "+PRODUTOS[i][0]).join(", "),total:totalLocal(p)}));
    const at=pedidos.filter(p=>p.status!=="cancelado"),rec=at.reduce((s,p)=>s+totalLocal(p),0);
    resumo={pedidos_ativos:at.length,receita:rec,ticket_medio:at.length?rec/at.length:0,horas_financiadas:at.reduce((s,p)=>s+minutosLocal(p),0)/60};
  }
  desenhar();
}

async function catalogos(){
  if(modo==="api"){
    const [c,p]=await Promise.all([chamar("GET","/admin/clientes"),chamar("GET","/produtos")]);
    catC=c.ok?c.dados:[];catP=p.ok?p.dados.map(x=>({id:x.id,nome:x.nome,preco:x.preco})):[];
  }else{
    catC=CLIENTES.map((nome,id)=>({id,nome}));catP=PRODUTOS.map(([nome,preco],id)=>({id,nome,preco}));
  }
  $("fCliente").innerHTML="";catC.forEach(c=>$("fCliente").add(new Option(c.nome,c.id)));
  $("fProduto").innerHTML="";catP.forEach(p=>$("fProduto").add(new Option(p.nome+" ("+brl(p.preco)+")",p.id)));
}

// ---------- Atualizar indicadores e desenhar a tabela ----------
function desenhar(){
  $("horas").textContent=(+resumo.horas_financiadas||0).toFixed(1).replace(".",",")+" h";
  $("receita").textContent=brl(+resumo.receita||0);
  $("qtd").textContent=resumo.pedidos_ativos||0;
  $("ticket").textContent=brl(+resumo.ticket_medio||0);

  const termo=$("busca").value.trim().toLowerCase();
  const vis=lista.filter(p=>(filtro==="todos"||p.status===filtro)&&p.cliente.toLowerCase().includes(termo));
  $("corpo").innerHTML="";
  vis.slice().sort((a,b)=>b.id-a.id).forEach(p=>{
    const tr=document.createElement("tr");if(p.status==="cancelado")tr.className="cancelado";
    [["#"+p.id],[p.cliente],[p.data],[p.itens,"itens"],[brl(p.total),"n"]].forEach(([t,c])=>{const td=document.createElement("td");td.textContent=t;if(c)td.className=c;tr.appendChild(td)});
    const tdS=document.createElement("td"),sel=document.createElement("select");
    sel.setAttribute("aria-label","Situação do pedido "+p.id);
    STATUS.forEach(s=>{const o=new Option(cap(s),s);o.selected=s===p.status;sel.add(o)});
    sel.onchange=()=>mudarStatus(p,sel.value);
    tdS.appendChild(sel);tr.appendChild(tdS);
    const tdA=document.createElement("td"),b=document.createElement("button");
    b.className="btn btn--claro btn--mini";b.textContent="Excluir";b.setAttribute("aria-label","Excluir pedido "+p.id);
    b.onclick=()=>excluir(p);tdA.appendChild(b);tr.appendChild(tdA);$("corpo").appendChild(tr)});
  $("vazio").hidden=vis.length>0;
}

// ---------- Alterar situação e excluir pedidos ----------
async function mudarStatus(p,novo){
  if(modo==="api"){
    try{const r=await chamar("PATCH","/admin/pedidos/"+p.id,{status:novo});if(!r.ok){avisar(erroApi(r));return carregar()}}
    catch(e){avisar("Erro: a API não respondeu.");return carregar()}
  }else{pedidos.find(x=>x.id===p.id).status=novo;guardar()}
  await carregar();avisar("Pedido "+p.id+" agora está como "+novo+".");
}
async function excluir(p){
  if(!confirm("Excluir o pedido "+p.id+"? Isso não pode ser desfeito."))return;
  if(modo==="api"){
    try{const r=await chamar("DELETE","/admin/pedidos/"+p.id);if(!r.ok){avisar(erroApi(r));return}}
    catch(e){avisar("Erro: a API não respondeu.");return}
  }else{pedidos=pedidos.filter(x=>x.id!==p.id);guardar()}
  await carregar();avisar("Pedido "+p.id+" excluído.");
}

// ---------- Filtros e busca de clientes ----------
["todos",...STATUS].forEach(s=>{
  const b=document.createElement("button");b.className="filtro";b.textContent=s==="todos"?"Todos":cap(s);b.setAttribute("aria-pressed",s===filtro);
  b.onclick=()=>{filtro=s;document.querySelectorAll(".filtro").forEach(x=>x.setAttribute("aria-pressed",x===b));desenhar()};
  $("filtros").appendChild(b);$("filtros").append(" ")});
$("busca").oninput=desenhar;

// ---------- Criar pedido e adicionar produtos ----------
function desenharRascunho(){
  $("rascunho").innerHTML="";let t=0;
  rascunho.forEach(([i,q])=>{const pr=catP.find(x=>x.id===i);t+=pr.preco*q;
    const li=document.createElement("li");li.textContent=q+"× "+pr.nome+" — "+brl(pr.preco*q);$("rascunho").appendChild(li)});
  $("fTotal").textContent=brl(t);
}
$("novo").onclick=()=>{rascunho=[];$("fErro").textContent="";$("fQtd").value=1;desenharRascunho();$("dlg").showModal();$("fCliente").focus()};
$("cancelarDlg").onclick=()=>$("dlg").close();
$("addItem").onclick=()=>{
  const i=+$("fProduto").value,q=Math.max(1,Math.min(20,+$("fQtd").value||1));
  const ja=rascunho.find(r=>r[0]===i);ja?ja[1]+=q:rascunho.push([i,q]);$("fErro").textContent="";desenharRascunho()};
$("salvar").onclick=async()=>{
  if(!rascunho.length){$("fErro").textContent="Erro: adicione pelo menos 1 item ao pedido.";return}
  const cid=+$("fCliente").value;let id;
  if(modo==="api"){
    try{const r=await chamar("POST","/admin/pedidos",{usuario_id:cid,itens:rascunho.map(([i,q])=>({produto_id:i,quantidade:q}))});
      if(!r.ok){$("fErro").textContent=erroApi(r);return}id=r.dados.id}
    catch(e){$("fErro").textContent="Erro: a API não respondeu.";return}
  }else{
    id=pedidos.reduce((m,p)=>Math.max(m,p.id),0)+1;
    pedidos.push({id,cliente:cid,data:new Date().toISOString().slice(0,10),status:"pago",itens:rascunho});guardar();
  }
  $("dlg").close();await carregar();avisar("Pedido "+id+" criado.")};

// ---------- Exportar a lista atual para CSV, compatível com Excel ----------
$("csv").onclick=()=>{
  const l=[["id","cliente","data","itens","total","status"],...lista.map(p=>[p.id,p.cliente,p.data,p.itens,p.total.toFixed(2),p.status])];
  const csv="\uFEFF"+l.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="pedidos-dynamo.csv";a.click();
  avisar("Arquivo pedidos-dynamo.csv gerado.")};

// ---------- Login de demonstração ----------
// Credencial fictícia para a apresentação; não use este login como autenticação de produção.
const ADMIN={email:"gestor@dynamosports.com",hash:"664a9dd0f667f7057373455fb15c5be35cce97e2ee7276b5eb998b43253ad9f1",sal:"dynamo-admin:"};
const hashDe=async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ADMIN.sal+t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
let falhas=0,bloqueadoAte=0;

async function entrar(){
  $("telaLogin").hidden=true;document.querySelector("header.topo").hidden=false;document.querySelector("main").hidden=false;
  $("modoTxt").textContent=modo==="api"?"● Conectado à API (dados do banco MySQL)":"○ Modo demonstração: API desligada, dados só neste navegador";
  try{sessionStorage.setItem(SESSAO,JSON.stringify({modo,token}))}catch(e){}
  await catalogos();await carregar();$("novo").focus();
}
function sairPainel(msg){
  try{sessionStorage.removeItem(SESSAO)}catch(e){}
  token="";$("telaLogin").hidden=false;document.querySelector("header.topo").hidden=true;document.querySelector("main").hidden=true;
  $("aErro").textContent=msg||"";$("aEmail").focus();
}
$("ver").onclick=()=>{const m=$("aSenha").type==="password";$("aSenha").type=m?"text":"password";
  $("ver").textContent=m?"Ocultar":"Mostrar";$("ver").setAttribute("aria-label",m?"Ocultar senha":"Mostrar senha");$("ver").setAttribute("aria-pressed",m)};
$("formAdmin").onsubmit=async e=>{
  e.preventDefault();const erro=$("aErro");
  const espera=Math.ceil((bloqueadoAte-Date.now())/1000);
  if(espera>0){erro.textContent="Erro: muitas tentativas. Aguarde "+espera+" segundos.";return}
  const email=$("aEmail").value.trim().toLowerCase(),senha=$("aSenha").value;
  if(!email||!senha){erro.textContent="Erro: preencha o e-mail e a senha.";(email?$("aSenha"):$("aEmail")).focus();return}

  // Edição de apresentação: não tenta conectar a uma API local ausente.
  // Credencial fictícia e dados locais, suficientes para uma demonstração no notebook.
  const entrou=email===ADMIN.email&&senha==="Dynamo@2026";
  modo="local";token="";
  if(entrou){falhas=0;erro.textContent="";$("aSenha").value="";await entrar();return}
  falhas++;if(falhas>=3){bloqueadoAte=Date.now()+10000;falhas=0}
  erro.textContent="Erro: e-mail ou senha incorretos.";$("aSenha").value="";$("aSenha").focus()};
$("sair").onclick=()=>sairPainel();

// Restaura o acesso enquanto a sessão do navegador ainda estiver ativa.
let sessao=null;try{sessao=JSON.parse(sessionStorage.getItem(SESSAO))}catch(e){}
if(sessao&&sessao.modo==="local"){modo="local";entrar()}
else if(sessao&&sessao.modo==="api"&&sessao.token){modo="api";token=sessao.token;entrar()}
else $("aEmail").focus();
