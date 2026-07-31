/* TurboWarp Windows-style Input Modal Extension */
(function (Scratch) {
  'use strict';

  const IconURI = 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0078d4" stroke-width="2" fill="none"/>
      <line x1="7" y1="9" x2="17" y2="9" stroke="#0078d4"/>
      <line x1="7" y1="12" x2="13" y2="12" stroke="#0078d4"/>
    </svg>
  `);

  /* 运行时变量 */
  let resolveInput = null;
  let inputRoot = null;

  /* 生成弹窗 DOM */
  function showInputModal(title, defaultText) {
    closeInputModal();

    const overlay = document.createElement('div');
    overlay.id = 'tw-input-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, fontFamily: '"Segoe UI",Tahoma,sans-serif', fontSize: '14px'
    });

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      background: 'rgba(255,255,255,.9)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: '8px',
      minWidth: '360px', maxWidth: '90vw',
      boxShadow: '0 8px 30px rgba(0,0,0,.2)',
      display: 'flex', flexDirection: 'column'
    });

    /* 标题栏 */
    const hdr = document.createElement('div');
    hdr.textContent = title;
    Object.assign(hdr.style, {
      padding: '12px 16px', fontWeight: 600,
      borderBottom: '1px solid rgba(0,0,0,.05)'
    });
    wrapper.appendChild(hdr);

    /* 输入区 */
    const body = document.createElement('div');
    body.style.padding = '20px';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultText;
    Object.assign(input.style, {
      width: '100%', boxSizing: 'border-box',
      padding: '8px 10px', borderRadius: '4px',
      border: '1px solid #999', outline: 'none',
      fontSize: '14px'
    });
    body.appendChild(input);
    wrapper.appendChild(body);

    /* 按钮栏 */
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      padding: '0 16px 16px', display: 'flex', gap: '8px', justifyContent: 'flex-end'
    });

    const okBtn = document.createElement('button');
    okBtn.textContent = '确定';
    Object.assign(okBtn.style, {
      padding: '5px 24px', border: 'none', borderRadius: '4px',
      background: '#0078d4', color: '#fff', cursor: 'pointer'
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      padding: '5px 24px', border: 'none', borderRadius: '4px',
      background: 'transparent', color: '#000', cursor: 'pointer'
    });

    okBtn.onclick = () => {
      if (resolveInput) { resolveInput(input.value); resolveInput = null; }
      closeInputModal();
    };
    cancelBtn.onclick = () => {
      if (resolveInput) { resolveInput(''); resolveInput = null; }
      closeInputModal();
    };

    bar.appendChild(cancelBtn);
    bar.appendChild(okBtn);
    wrapper.appendChild(bar);
    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);
    inputRoot = overlay;

    /* 自动聚焦输入框 */
    input.focus();
    input.select();

    /* 回车=确定，ESC=取消 */
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Enter') okBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  }

  function closeInputModal() {
    if (inputRoot) {
      inputRoot.remove();
      inputRoot = null;
    }
  }

  /* Scratch 扩展定义 */
  class InputModalExt {
    getInfo() {
      return {
        id: 'winInput',
        name: '输入弹窗',
        color1: '#0078d4',
        color2: '#005a9e',
        menuIconURI: IconURI,
        blocks: [
          {
            opcode: 'askAndWait',
            blockType: Scratch.BlockType.REPORTER,
            text: '弹出输入框 标题 [TITLE] 默认 [DEFAULT]',
            arguments: {
              TITLE:   { type: Scratch.ArgumentType.STRING, defaultValue: '请输入' },
              DEFAULT: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
            }
          }
        ]
      };
    }

    askAndWait(args) {
      return new Promise(resolve => {
        resolveInput = resolve;
        showInputModal(args.TITLE, args.DEFAULT);
      });
    }
  }

  Scratch.extensions.register(new InputModalExt());
})(Scratch);