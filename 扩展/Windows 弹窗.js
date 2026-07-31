/* TurboWarp Windows-style Modal Extension */
(function(Scratch) {
  'use strict';

  const IconURI = 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0078d4" stroke-width="2"/>
      <line x1="7" y1="9" x2="17" y2="9" stroke="#0078d4"/>
      <line x1="7" y1="12" x2="13" y2="12" stroke="#0078d4"/>
    </svg>
  `);

  /* 图标 SVG */
  const SYSTEM_ICONS = {
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v7z',
    error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    question:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm2-9c1.1 0 2 .9 2 2H13c0-.55-.45-1-1-1s-1 .45-1 1c0 .55.45 1 1 1 .55 0 1 .45 1 1H11c0-1.1.9-2 2-2z'
  };

  /* 运行时状态 */
  let buttons = []; // {text,value,default?}
  let modalResolve = null;
  let modalRoot = null;

  /* 创建 Windows 弹窗 */
  function showWindowsModal(title, content, iconType = 'info') {
    closeModal();

    /* 遮罩 */
    const overlay = document.createElement('div');
    overlay.id = 'tw-win-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, fontFamily: '"Segoe UI",Tahoma,sans-serif',
      fontSize: '14px'
    });

    /* 主容器 */
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      background: 'rgba(255,255,255,.9)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: '8px',
      minWidth: '360px', maxWidth: '90vw', maxHeight: '90vh',
      boxShadow: '0 8px 30px rgba(0,0,0,.2)',
      display: 'flex', flexDirection: 'column'
    });

    /* 标题栏 */
    const hdr = document.createElement('div');
    hdr.textContent = title;
    Object.assign(hdr.style, {
      padding: '12px 16px', fontSize: '14px', fontWeight: 600,
      borderBottom: '1px solid rgba(0,0,0,.05)'
    });
    wrapper.appendChild(hdr);

    /* 内容区 */
    const body = document.createElement('div');
    body.style.padding = '20px';
    body.style.display = 'flex';
    body.style.gap = '16px';
    body.style.alignItems = 'flex-start';

    /* 图标 */
    if (SYSTEM_ICONS[iconType]) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.style.width = '32px'; svg.style.height = '32px'; svg.style.flexShrink = 0;
      svg.style.fill = '#0078d4';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', SYSTEM_ICONS[iconType]);
      svg.appendChild(path);
      body.appendChild(svg);
    }

    const msg = document.createElement('div');
    msg.textContent = content;
    msg.style.whiteSpace = 'pre-wrap';
    body.appendChild(msg);
    wrapper.appendChild(body);

    /* 按钮栏 */
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      padding: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end',
      borderTop: '1px solid rgba(0,0,0,.05)'
    });

    buttons.forEach((btn, idx) => {
      const b = document.createElement('button');
      b.textContent = btn.text;
      Object.assign(b.style, {
        padding: '5px 24px', minWidth: '80px',
        border: '1px solid transparent', borderRadius: '4px',
        fontFamily: 'inherit', fontSize: '14px',
        background: btn.default ? '#0078d4' : 'transparent',
        color: btn.default ? '#fff' : '#000',
        cursor: 'pointer'
      });
      b.onmouseenter = () => {
        if (!btn.default) b.style.background = 'rgba(0,0,0,.05)';
      };
      b.onmouseleave = () => {
        if (!btn.default) b.style.background = 'transparent';
      };
      b.onclick = () => {
        if (modalResolve) {
          modalResolve(btn.value);
          modalResolve = null;
        }
        closeModal();
      };
      bar.appendChild(b);
    });

    wrapper.appendChild(bar);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);
    modalRoot = overlay;

    /* ESC / 关闭按钮 */
    const closeVia = val => {
      if (modalResolve) {
        modalResolve(val);
        modalResolve = null;
      }
      closeModal();
    };
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeVia(null);
    });
    document.addEventListener('keydown', escClose);
    function escClose(e) {
      if (e.key === 'Escape') {
        closeVia(null);
        document.removeEventListener('keydown', escClose);
      }
    }
  }

  function closeModal() {
    if (modalRoot) {
      modalRoot.remove();
      modalRoot = null;
    }
  }

  /* Scratch 扩展 */
  class WindowsModalExt {
    getInfo() {
      return {
        id: 'winModal',
        name: 'Windows 弹窗',
        color1: '#0078d4',
        color2: '#005a9e',
        menuIconURI: IconURI,
        blocks: [
          {
            opcode: 'clearButtons',
            blockType: Scratch.BlockType.COMMAND,
            text: '清空所有按钮'
          },
          {
            opcode: 'addButton',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加按钮 [TEXT] 返回值 [VALUE] 默认 [DF]',
            arguments: {
              TEXT:  { type: Scratch.ArgumentType.STRING, defaultValue: '确定' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'ok' },
              DF:    { type: Scratch.ArgumentType.BOOLEAN, defaultValue: true }
            }
          },
          {
            opcode: 'showModal',
            blockType: Scratch.BlockType.COMMAND,
            text: '显示 Windows 弹窗 图标 [ICON] 标题 [TITLE] 内容 [BODY]',
            arguments: {
              ICON:  { type: Scratch.ArgumentType.STRING,
                       menu: 'icons', defaultValue: 'info' },
              TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: '提示' },
              BODY:  { type: Scratch.ArgumentType.STRING, defaultValue: '这是一条消息' }
            }
          },
          {
            opcode: 'waitClick',
            blockType: Scratch.BlockType.REPORTER,
            text: '等待按钮点击并返回值'
          }
        ],
        menus: {
          icons: { acceptReporters: false, items: ['info', 'warning', 'error', 'question'] }
        }
      };
    }

    clearButtons() { buttons = []; }
    addButton(args) {
      buttons.push({ text: args.TEXT, value: args.VALUE, default: args.DF });
    }
    showModal(args) { showWindowsModal(args.TITLE, args.BODY, args.ICON); }
    waitClick() {
      return new Promise(resolve => { modalResolve = resolve; });
    }
  }

  Scratch.extensions.register(new WindowsModalExt());
})(Scratch);