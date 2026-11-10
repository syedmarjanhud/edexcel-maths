(function(){
"use strict";
var DATA=window.TRACKER_DATA, STORE_KEY="edexcel-tracker-v1";
var mem={}, state={course:0,tab:"dashboard",filt:{ch:"",st:"",sort:""}};
function load(){try{var r=localStorage.getItem(STORE_KEY);if(r)mem=JSON.parse(r)||{}}catch(e){}}
var warned=false;
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(mem))}catch(e){if(!warned){warned=true;toast("Browser storage is blocked, so ratings will not be kept. Use Export to save them.")}}}
function key(ci,bi,si){return DATA[ci].key+"|"+bi+"|"+si}
function get(ci,bi,si){return mem[key(ci,bi,si)]||{}}
function toast(t){var el=document.getElementById("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){el.classList.remove("show")},2600)}
function $(s,r){return (r||document).querySelector(s)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function conf(ci,bi,si){var c=parseFloat(get(ci,bi,si).c);return isFinite(c)&&c>=1&&c<=5?c:null}
function secStatus(c){if(c==null)return"Not started";if(c<=2)return"Critical";if(c===3)return"Shaky";if(c===4)return"Solid";return"Exam ready"}
function avgStatus(n,a){if(!n)return"Not started";if(a<2)return"Critical";if(a<3.5)return"Shaky";if(a<4.5)return"Solid";return"Exam ready"}
function cls(s){return"s-"+s.split(" ")[0]}
function pill(s){return'<span class="pill '+cls(s)+'">'+s+'</span>'}
function mix(a,b,t){return a.map(function(x,i){return Math.round(x+(b[i]-x)*t)})}
function scoreColor(v){if(v==null||v==="")return"";var R=[248,105,107],Y=[255,235,132],G=[99,190,123];var c=v<=3?mix(R,Y,(v-1)/2):mix(Y,G,(v-3)/2);return"rgb("+c.join(",")+")"}
function fmtDate(d){if(!d)return"Never";var p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0]}

// ---- stats
function bookStats(ci,bi){
  var b=DATA[ci].books[bi],n=b.sections.length,rated=0,sum=0,weak=0,strong=0,mid=0,last="",chs={},order=[];
  b.sections.forEach(function(s,si){
    var c=conf(ci,bi,si),d=get(ci,bi,si).d||"";
    if(!chs[s.ch]){chs[s.ch]={name:s.ch,n:0,rated:0,sum:0,weak:0,last:"",book:bi};order.push(s.ch)}
    var h=chs[s.ch];h.n++;
    if(c!=null){rated++;sum+=c;h.rated++;h.sum+=c;if(c<=2){weak++;h.weak++}if(c>=4)strong++;if(c===3)mid++}
    if(d&&d>last)last=d; if(d&&d>h.last)h.last=d;
  });
  return{n:n,rated:rated,sum:sum,avg:rated?sum/rated:null,weak:weak,strong:strong,mid:mid,last:last,chapters:order.map(function(k){return chs[k]})};
}
function allStats(ci){
  var books=DATA[ci].books.map(function(_,bi){return bookStats(ci,bi)});
  var t={n:0,rated:0,sum:0,weak:0,strong:0,mid:0,last:""};
  books.forEach(function(b){t.n+=b.n;t.rated+=b.rated;t.sum+=b.sum;t.weak+=b.weak;t.strong+=b.strong;t.mid+=b.mid;if(b.last>t.last)t.last=b.last});
  t.avg=t.rated?t.sum/t.rated:null;t.books=books;return t;
}

// ---- chrome
function renderChrome(){
  var c=DATA[state.course];
  document.title="Edexcel "+c.name+" Revision Tracker";
  $("#title").textContent="EDEXCEL "+c.name.toUpperCase().replace("A-LEVEL","A-LEVEL")+" "+c.code+"  //  REVISION COMMAND CENTRE";
  $("#subtitle").textContent="Live view of all "+c.books.length+" textbook tabs. Fill in Confidence + Last Reviewed on those tabs and every number here updates. Saved in this browser.";
  var sw=$("#courseSwitch");sw.innerHTML="";
  DATA.forEach(function(d,i){var b=document.createElement("button");b.textContent=d.name.replace("A-Level ","");b.className=i===state.course?"on":"";b.onclick=function(){state.course=i;state.tab="dashboard";state.filt={ch:"",st:"",sort:""};render()};sw.appendChild(b)});
  var tabs=$("#tabs");tabs.innerHTML="";
  function add(id,label,color){var b=document.createElement("button");b.textContent=label;b.style.borderTopColor=color;if(state.tab===id)b.className="on";b.onclick=function(){state.tab=id;state.filt={ch:"",st:"",sort:""};render()};tabs.appendChild(b)}
  add("dashboard","Dashboard","#0f1e3d");
  c.books.forEach(function(b,i){add(String(i),b.id,"#"+b.tab)});
}

// ---- dashboard
function kpi(color,h,v,s){return'<div class="kpi"><div class="h" style="background:'+color+'">'+h+'</div><div class="v" style="color:'+color+'">'+v+'</div><div class="s">'+s+'</div></div>'}
function dashboard(){
  var ci=state.course,c=DATA[ci],T=allStats(ci),chap=[];
  T.books.forEach(function(b,bi){b.chapters.forEach(function(h){h.code=c.books[bi].code;chap.push(h)})});
  var unstarted=chap.filter(function(h){return!h.rated}).length;
  var h='<div class="kpis">'+
   kpi("#2e75b6","SECTIONS RATED",T.rated,"of "+T.n+" sections in the course")+
   kpi("#00857c","COURSE COVERED",(T.n?Math.round(T.rated/T.n*1000)/10:0)+"%","untouched: "+(T.n-T.rated)+" sections")+
   kpi("#70ad47","AVG CONFIDENCE",T.avg==null?"0.00":T.avg.toFixed(2),"out of 5.00  |  target 4.00+")+
   kpi("#c55a11","EXAM READY (4-5)",T.strong,"sections you could sit tomorrow")+
   kpi("#7030a0","NEEDS WORK (1-2)",T.weak,"sections flagged red")+
   kpi("#1f4e79","CHAPTERS UNSTARTED",unstarted,"of "+chap.length+" chapters with no rating yet")+'</div>';
  h+='<div class="sec">PROGRESS BY BOOK</div><div class="panel"><table><tr><th class="l">Book</th><th>Sections</th><th>Rated</th><th>Avg conf</th><th>Weak (1-2)</th><th>Last reviewed</th><th>Status</th></tr>';
  T.books.forEach(function(b,bi){h+='<tr><td class="l"><b>'+esc(c.books[bi].id)+'</b></td><td>'+b.n+'</td><td>'+b.rated+'</td><td>'+sc(b.avg)+'</td><td>'+b.weak+'</td><td>'+fmtDate(b.last)+'</td><td>'+pill(avgStatus(b.rated,b.avg))+'</td></tr>'});
  h+='<tr class="tot"><td class="l">ALL '+c.books.length+' BOOKS</td><td>'+T.n+'</td><td>'+T.rated+'</td><td>'+(T.avg==null?"":T.avg.toFixed(2))+'</td><td>'+T.weak+'</td><td>'+fmtDate(T.last)+'</td><td>'+avgStatus(T.rated,T.avg)+'</td></tr></table></div>';
  h+='<div class="sec">VISUAL BREAKDOWN</div><div class="charts"><div class="chart"><h3>Average confidence by book</h3><div id="barc"></div></div><div class="chart"><h3>Where the '+T.n+' sections sit</h3><div id="pie"></div></div></div>';
  var q=chap.map(function(x,i){return{x:x,k:(x.rated?x.sum/x.rated:0),i:i}}).sort(function(a,b){return a.k-b.k||a.i-b.i}).slice(0,10);
  h+='<div class="sec red">PRIORITY QUEUE  //  the 10 chapters to hit next (weakest first, unrated counts as weakest)</div><div class="panel"><table><tr><th>#</th><th class="l">Chapter</th><th>Avg conf</th><th>Rated</th><th>Status</th></tr>';
  q.forEach(function(r,i){var x=r.x;h+='<tr><td>'+(i+1)+'</td><td class="l">'+esc(x.code)+' &nbsp;|&nbsp; '+esc(x.name)+'</td><td>'+sc(x.rated?x.sum/x.rated:null)+'</td><td>'+x.rated+' / '+x.n+'</td><td>'+pill(avgStatus(x.rated,x.rated?x.sum/x.rated:0))+'</td></tr>'});
  h+='</table></div><div class="sec">CHAPTER BREAKDOWN  //  all '+chap.length+' chapters</div><div class="panel"><table><tr><th class="l">Chapter</th><th>Sections</th><th>Rated</th><th>Avg conf</th><th>Weak (1-2)</th><th>Last reviewed</th><th>Status</th></tr>';
  var prev=null;
  chap.forEach(function(x){var a=x.rated?x.sum/x.rated:null;
    if(x.code!==prev){h+='<tr><td class="l" colspan="7" style="background:#18223f;font-weight:bold">'+esc(x.code)+'</td></tr>';prev=x.code}
    h+='<tr><td class="l">'+esc(x.name)+'</td><td>'+x.n+'</td><td>'+x.rated+'</td><td>'+sc(a)+'</td><td>'+x.weak+'</td><td>'+fmtDate(x.last)+'</td><td>'+pill(avgStatus(x.rated,a))+'</td></tr>'});
  h+='</table></div><div class="sec">HOW TO USE</div><div class="how">'+
   '<p>You only ever type on the '+c.books.length+' book tabs: Confidence (1-5 dropdown), Last Reviewed (date), Notes. This tab is all calculated - nothing to type here.</p>'+
   '<p>Example row: Confidence = 4, Last Reviewed = 18/08/2026, Notes = "fine on the method, redo Ex 3C Q8 without notes".</p>'+
   '<p>Confidence scale: 1 = no idea | 2 = need reteaching | 3 = can do it with the book open | 4 = can do it cold | 5 = exam ready under time.</p>'+
   '<p>Status thresholds (chapter avg): under 2.0 Critical, under 3.5 Shaky, under 4.5 Solid, 4.5+ Exam ready. Chapters with zero ratings show Not started.</p>'+
   '<p>Priority queue ranks chapters by average confidence, treating unrated chapters as the weakest, so it doubles as a start-here list. Ties break by book order.</p>'+
   (ci===1?'<p>Further Maths = Core Pure (compulsory) + two optional modules. Rate only the modules you take; the other books will pull the averages down, so ignore them.</p>':'')+
   '<p>Your ratings are saved in this browser only. Use Export to back them up or move them to another device, and Import to load them back.</p></div>';
  return h;
}
function sc(a){return a==null?"":'<span class="score" style="background:'+scoreColor(a)+'">'+a.toFixed(2)+'</span>'}
function drawCharts(){
  var ci=state.course,c=DATA[ci],T=allStats(ci),n=c.books.length;
  var w=Math.max(320,n*58),H=210,pad=28,svg='<svg viewBox="0 0 '+w+' '+(H+30)+'" width="100%" role="img" aria-label="Average confidence by book">';
  for(var g=0;g<=5;g++){var y=H-g*(H-20)/5;svg+='<line x1="'+pad+'" x2="'+(w-6)+'" y1="'+y+'" y2="'+y+'" stroke="#26304d"/><text x="'+(pad-6)+'" y="'+(y+4)+'" font-size="10" text-anchor="end" fill="#8d99b8">'+g+'</text>'}
  T.books.forEach(function(b,i){var bw=(w-pad-10)/n,x=pad+i*bw+bw*.18,v=b.avg||0,hh=v*(H-20)/5;
    svg+='<rect x="'+x+'" y="'+(H-hh)+'" width="'+bw*.64+'" height="'+hh+'" fill="#'+c.books[i].tab+'" rx="2"/>';
    if(b.avg!=null)svg+='<text x="'+(x+bw*.32)+'" y="'+(H-hh-4)+'" font-size="10" text-anchor="middle" fill="#e3e8f4">'+b.avg.toFixed(1)+'</text>';
    svg+='<text x="'+(x+bw*.32)+'" y="'+(H+14)+'" font-size="10" text-anchor="middle" fill="#e3e8f4">'+esc(c.books[i].code)+'</text>'});
  $("#barc").innerHTML=svg+'</svg>';
  var parts=[["Not rated",T.n-T.rated,"#4f81bd"],["Weak 1-2",T.weak,"#c0504d"],["Middling 3",T.mid,"#9bbb59"],["Strong 4-5",T.strong,"#8064a2"]],tot=T.n||1,a0=-Math.PI/2,cx=90,cy=90,r=80,p='<svg viewBox="0 0 320 180" width="100%" role="img" aria-label="Status split">';
  parts.forEach(function(s){var f=s[1]/tot;if(!f)return;if(f>=.9999){p+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+s[2]+'"/>';return}var a1=a0+f*2*Math.PI,l=f>.5?1:0;
    p+='<path d="M'+cx+','+cy+' L'+(cx+r*Math.cos(a0))+','+(cy+r*Math.sin(a0))+' A'+r+','+r+' 0 '+l+' 1 '+(cx+r*Math.cos(a1))+','+(cy+r*Math.sin(a1))+' Z" fill="'+s[2]+'"/>';a0=a1});
  parts.forEach(function(s,i){p+='<rect x="195" y="'+(50+i*24)+'" width="12" height="12" fill="'+s[2]+'"/><text x="213" y="'+(60+i*24)+'" font-size="12" fill="#e3e8f4">'+s[0]+' ('+s[1]+')</text>'});
  $("#pie").innerHTML=p+'</svg>';
}

// ---- book view
function link(l){return l?'<a href="'+esc(l[1])+'" target="_blank" rel="noopener noreferrer">'+esc(l[0])+'</a>':""}
function bookView(bi){
  var ci=state.course,c=DATA[ci],b=c.books[bi],S=bookStats(ci,bi),f=state.filt;
  var chapters=S.chapters.map(function(x){return x.name});
  var h='<div class="bar">'+b.title+' &nbsp;|&nbsp; '+S.n+' sections &nbsp;|&nbsp; '+S.rated+' rated &nbsp;|&nbsp; '+(S.avg==null?"0.00":S.avg.toFixed(2))+' avg confidence &nbsp;|&nbsp; '+S.strong+' exam ready &nbsp;|&nbsp; '+S.weak+' need work</div>';
  h+='<div class="filters"><label>Chapter <select id="fCh"><option value="">All</option>'+chapters.map(function(x){return'<option'+(f.ch===x?" selected":"")+'>'+esc(x)+'</option>'}).join("")+'</select></label>'+
   '<label>Status <select id="fSt"><option value="">All</option>'+["Not started","Critical","Shaky","Solid","Exam ready"].map(function(x){return'<option'+(f.st===x?" selected":"")+'>'+x+'</option>'}).join("")+'</select></label>'+
   '<label>Sort <select id="fSort"><option value="">Book order</option><option value="asc"'+(f.sort==="asc"?" selected":"")+'>Confidence low to high</option><option value="desc"'+(f.sort==="desc"?" selected":"")+'>Confidence high to low</option></select></label></div>';
  h+='<div class="panel"><table class="booktbl"><thead><tr><th class="l">Chapter</th><th>Section</th><th class="l">Section title</th><th>Video</th><th>Confidence (1-5)</th><th>Last Reviewed</th><th>Status</th><th class="l">Notes</th><th>Primary worksheet</th><th>Extra practice</th><th>Past-paper topic questions</th><th>Mark scheme</th></tr></thead><tbody>';
  var chIdx={};chapters.forEach(function(x,i){chIdx[x]=i});
  var rows=b.sections.map(function(s,si){return{s:s,si:si}}).filter(function(r){
    if(f.ch&&r.s.ch!==f.ch)return false;
    if(f.st&&secStatus(conf(ci,bi,r.si))!==f.st)return false;return true});
  if(f.sort)rows.sort(function(a,z){var x=conf(ci,bi,a.si)||0,y=conf(ci,bi,z.si)||0;return f.sort==="asc"?x-y||a.si-z.si:y-x||a.si-z.si});
  var prev=null;
  rows.forEach(function(r){var s=r.s,si=r.si,v=get(ci,bi,si),cv=conf(ci,bi,si),st=secStatus(cv),first=s.ch!==prev;prev=s.ch;
    h+='<tr data-si="'+si+'" class="'+(chIdx[s.ch]%2===0?"band ":"")+(first?"chfirst":"")+'"><td class="l nw">'+esc(s.ch)+'</td><td>'+esc(s.n)+'</td><td class="l t">'+esc(s.t)+'</td><td class="k">'+link(s.v)+'</td>'+
     '<td><select class="fc" style="background:'+scoreColor(cv)+'"><option value=""></option>'+[1,2,3,4,5].map(function(n){return'<option'+(cv===n?" selected":"")+'>'+n+'</option>'}).join("")+'</select></td>'+
     '<td><input class="fd" type="date" value="'+esc(v.d||"")+'"></td><td class="st">'+pill(st)+'</td>'+
     '<td><input class="fn" type="text" value="'+esc(v.n||"")+'" placeholder="Notes"></td><td class="k">'+link(s.a)+'</td><td class="k">'+link(s.b)+'</td><td class="k">'+link(s.c)+'</td><td class="k">'+link(s.d)+'</td></tr>'});
  if(!rows.length)h+='<tr><td colspan="12">No sections match these filters.</td></tr>';
  h+='</tbody></table></div>';
  if(ci===1)h+='<div class="src">Video opens a YouTube search for the chapter. Topic questions come from physicsandmathstutor.com; past papers and mark schemes from physicsandmathstutor.com and savemyexams.com. Blank link cells mean no verified link was found.</div>';
  return h;
}
function bindBook(bi){
  var ci=state.course;
  $("#fCh").onchange=function(){state.filt.ch=this.value;render()};
  $("#fSt").onchange=function(){state.filt.st=this.value;render()};
  $("#fSort").onchange=function(){state.filt.sort=this.value;render()};
  document.querySelectorAll(".booktbl tbody tr[data-si]").forEach(function(tr){
    var si=+tr.getAttribute("data-si");
    function put(k,val){var kk=key(ci,bi,si),o=mem[kk]||{};if(val===""||val==null)delete o[k];else o[k]=val;if(Object.keys(o).length)mem[kk]=o;else delete mem[kk];save()}
    tr.querySelector(".fc").onchange=function(){put("c",this.value);
      if(!get(ci,bi,si).d&&this.value){var d=new Date(),iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");put("d",iso);tr.querySelector(".fd").value=iso}
      var cv=conf(ci,bi,si);this.style.background=scoreColor(cv);tr.querySelector(".st").innerHTML=pill(secStatus(cv));refreshBar(bi)};
    tr.querySelector(".fd").onchange=function(){put("d",this.value)};
    tr.querySelector(".fn").oninput=function(){put("n",this.value)};
  });
}
function refreshBar(bi){var S=bookStats(state.course,bi),b=DATA[state.course].books[bi];
  $(".bar").innerHTML=b.title+' &nbsp;|&nbsp; '+S.n+' sections &nbsp;|&nbsp; '+S.rated+' rated &nbsp;|&nbsp; '+(S.avg==null?"0.00":S.avg.toFixed(2))+' avg confidence &nbsp;|&nbsp; '+S.strong+' exam ready &nbsp;|&nbsp; '+S.weak+' need work'}

function render(){
  renderChrome();var v=$("#view");
  if(state.tab==="dashboard"){v.innerHTML=dashboard();drawCharts()}
  else{var bi=+state.tab;v.innerHTML=bookView(bi);bindBook(bi)}
}

// ---- export / import / reset
$("#btnExport").onclick=function(){
  var blob=new Blob([JSON.stringify({version:1,saved:new Date().toISOString(),ratings:mem},null,1)],{type:"application/json"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="revision-tracker-ratings.json";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);toast("Exported")};
$("#btnImport").onclick=function(){$("#fileImport").click()};
$("#fileImport").onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();
  r.onload=function(){try{var o=JSON.parse(r.result);if(!o||typeof o.ratings!=="object")throw 0;mem=o.ratings;save();render();toast("Imported")}catch(e){toast("That file is not a tracker export")}};
  r.readAsText(f);this.value=""};
$("#btnReset").onclick=function(){var c=DATA[state.course];
  if(!confirm("Clear every rating, date and note for "+c.name+"? This cannot be undone (export first if unsure)."))return;
  Object.keys(mem).forEach(function(k){if(k.indexOf(c.key+"|")===0)delete mem[k]});save();render();toast("Cleared")};
load();render();
})();
