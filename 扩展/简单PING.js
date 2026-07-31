(function(Scratch) {
  'use strict';

  // ========== 预设端口列表（可自行修改） ==========
  const DEFAULT_PORTS = [
    80, 443, 8080, 8443, 8000, 8888,
    7000, 9000, 3000, 5000, 8090, 9001,
    4000, 6000, 10000, 12345
  ];

  /**
   * 并发探测所有端口，当第一个成功时立即取消所有其他请求并返回
   */
  function pingPorts(ip, timeoutPerPort = 1500) {
    const ports = DEFAULT_PORTS;
    return new Promise((resolve) => {
      let active = ports.length;
      let found = false;
      const controllers = [];        // 存储所有端口的 AbortController

      if (ports.length === 0) {
        resolve({ online: false, port: null, time: -1 });
        return;
      }

      ports.forEach((port) => {
        const controller = new AbortController();
        controllers.push(controller);
        const timer = setTimeout(() => {
          controller.abort();        // 超时则中止该请求
          checkDone();
        }, timeoutPerPort);
        const start = performance.now();

        fetch(`http://${ip}:${port}`, {
          signal: controller.signal,
          mode: 'no-cors',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        })
        .then(() => {
          clearTimeout(timer);
          if (!found) {
            found = true;
            // 立即中止所有其他请求（包括未完成的）
            controllers.forEach(ctrl => {
              if (ctrl !== controller) {
                ctrl.abort();
              }
            });
            const elapsedSec = parseFloat(((performance.now() - start) / 1000).toFixed(3));
            resolve({ online: true, port: port, time: elapsedSec });
          }
        })
        .catch(() => {
          clearTimeout(timer);
          checkDone();
        });

        function checkDone() {
          if (!found) {
            active--;
            if (active === 0) {
              // 所有端口均无响应或失败
              resolve({ online: false, port: null, time: -1 });
            }
          }
        }
      });
    });
  }

  class SimplePing {
    getInfo() {
      return {
        id: 'simpleping',
        name: '简单PING',
        color1: '#4CAF50',
        color2: '#388E3C',
        blocks: [
          {
            opcode: 'ping',
            blockType: Scratch.BlockType.REPORTER,
            text: 'PING IP [IP] 返回 JSON',
            arguments: {
              IP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '192.168.1.1'
              }
            }
          }
        ]
      };
    }

    async ping(args) {
      const ip = args.IP.trim();

      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ip || !ipRegex.test(ip)) {
        return JSON.stringify({ error: 'IP格式错误' });
      }

      try {
        const result = await pingPorts(ip);
        const jsonObj = {
          ip: ip,
          online: result.online,
          port: result.port,
          time: result.time   // 秒
        };
        return JSON.stringify(jsonObj);
      } catch (e) {
        return JSON.stringify({ error: e.message });
      }
    }
  }

  Scratch.extensions.register(new SimplePing());
})(Scratch);