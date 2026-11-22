
/* theme: saved choice ('light'/'dark') wins; otherwise follow the system setting */
(function(){const k='qbank-theme',m=matchMedia('(prefers-color-scheme: dark)');
 const get=()=>{try{return localStorage.getItem(k)}catch(e){return null}};
 const apply=()=>{document.documentElement.dataset.theme=get()||'dark'};
 apply();m.addEventListener('change',apply);
 window.toggleTheme=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(k,t)}catch(e){}document.documentElement.dataset.theme=t};
})();

;

window.QB={list:[],lects:[],pics:{},akt:{exams:[],qs:[]},aktLoad(d){this.akt=d},importLoad(d){this.imp=d},reg(a){this.lects=a},add(l,arr){arr.forEach(q=>{q.l=l;this.list.push(q)})},
  pic(o){Object.assign(this.pics,o);document.querySelectorAll('img[data-pic]').forEach(i=>{if(this.pics[i.dataset.pic])i.src=this.pics[i.dataset.pic]})}};
