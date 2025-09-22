// 小图标
const iconPlay  = "▶︎ 播放";
const iconPause = "⏸ 暂停";

// 复用播放器
const player = document.getElementById("player");
let currentBtn = null;

// 读取 URL 参数
function getQuery(name, fallback=null){
  const v = new URLSearchParams(location.search).get(name);
  return v ?? fallback;
}

// 下拉加载课文列表
async function loadLessonList(){
  const sel = document.getElementById("lesson-select");
  const res = await fetch(`data/index.json?v=${Date.now()}`);
  const list = await res.json();

  sel.innerHTML = "";
  for(const it of list.lessons){
    const opt = document.createElement("option");
    opt.value = it.id; opt.textContent = it.title;
    sel.appendChild(opt);
  }

  // 选择当前
  const cur = getQuery("lesson", list.lessons[0]?.id || "");
  sel.value = cur;
  sel.onchange = () => {
    const id = sel.value;
    const url = new URL(location.href);
    url.searchParams.set("lesson", id);
    location.href = url.toString();
  };

  return cur;
}

function play(btn, src){
  if (!src){ return; }
  // 再次点击同一按钮 → 暂停
  if (currentBtn === btn && !player.paused){
    player.pause();
    btn.textContent = iconPlay;
    currentBtn = null;
    return;
  }
  // 切换按钮状态
  if (currentBtn && currentBtn !== btn) currentBtn.textContent = iconPlay;
  currentBtn = btn;
  btn.disabled = true;
  btn.textContent = iconPause;

  // 切换音源
  const abs = new URL(src, location).href;
  if (player.src !== abs) player.src = abs;
  player.currentTime = 0;

  player.play().catch(err=>{
    console.error("播放失败", err);
    alert("音频播放失败：请检查路径或替换为你的 mp3。");
    btn.textContent = iconPlay;
    currentBtn = null;
  }).finally(()=>{ btn.disabled = false; });
}

player.addEventListener("ended", ()=>{
  if (currentBtn){ currentBtn.textContent = iconPlay; currentBtn = null; }
});
player.addEventListener("error", ()=>{
  if (currentBtn){ currentBtn.textContent = iconPlay; currentBtn = null; }
});

// 渲染课文
async function renderLesson(lessonId){
  const app = document.getElementById("app");
  app.innerHTML = `<p class="note">加载中…</p>`;
  try{
    const res = await fetch(`data/${lessonId}.json?v=${Date.now()}`);
    if(!res.ok) throw new Error(res.status);
    const data = await res.json();

    // 标题区
    const header = document.createElement("div");
    header.className = "header-row";

    const h2 = document.createElement("h2");
    h2.textContent = data.title;
    header.appendChild(h2);

    if (data.coverAudio){
      const hb = document.createElement("button");
      hb.className = "play-button";
      hb.textContent = iconPlay;
      hb.onclick = () => play(hb, data.coverAudio);
      header.appendChild(hb);
    }

    // 内容
    const frag = document.createDocumentFragment();
    frag.appendChild(header);
    if (data.subtitle){
      const sub = document.createElement("div");
      sub.className = "note";
      sub.textContent = data.subtitle;
      frag.appendChild(sub);
    }
    frag.appendChild(document.createElement("hr"));

    (data.paragraphs || []).forEach(p=>{
      const el = document.createElement("p");
      // 支持你原来的 HTML 片段（含 tooltip）
      if (p.html){ el.innerHTML = p.html; }
      else if (p.text){ el.textContent = p.text; }

      if (p.audio){
        const b = document.createElement("button");
        b.className = "play-button";
        b.textContent = iconPlay;
        b.onclick = () => play(b, p.audio);
        el.appendChild(b);
      }
      frag.appendChild(el);
    });

    app.innerHTML = "";
    app.appendChild(frag);
  }catch(e){
    console.error(e);
    app.innerHTML = `
      <div class="note">
        加载失败（${e.message}）。请确认 data/${lessonId}.json 是否存在、路径是否正确。
        <button id="retry">重试</button>
      </div>`;
    document.getElementById("retry").onclick = ()=>renderLesson(lessonId);
  }
}

// 入口
(async function(){
  const lessonId = await loadLessonList();
  await renderLesson(lessonId);
})();
