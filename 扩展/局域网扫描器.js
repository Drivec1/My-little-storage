(function(Scratch) {
  'use strict';

  /**
   * 获取本机内网 IP（通过 WebRTC ICE 候选）
   * @returns {Promise<string>}
   */
  function getLocalIP() {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');   // 必须创建数据通道才能触发候选
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => reject('WebRTC error'));

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const candidate = e.candidate.candidate;
        // 从候选字符串中提取 IP 地址（第 5 个字段）
        const parts = candidate.split(' ');
        const ip = parts[4];
        // 过滤掉 IPv6 和 0.0.0.0
        if (ip && ip !== '0.0.0.0' && !ip.includes(':')) {
          resolve(ip);
          pc.close();
        }
      };

      // 超时保护
      setTimeout(() => {
        reject('Timeout: no IP candidate');
        pc.close();
      }, 3000);
    });
  }

  /**
   * 尝试检测指定 IP 的设备名称
   * @param {string} ip
   * @param {number} timeout 超时（毫秒）
   * @returns {Promise<{ip:string, name:string}|null>}
   */
  function checkDevice(ip, timeout = 1500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(`http://${ip}`, {
      signal: controller.signal,
      mode: 'cors',           // 需要 CORS 才能读取响应头/正文
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(response => {
        clearTimeout(timer);
        if (!response.ok) return null;

        // 尝试从 Server 头获取名称
        let name = response.headers.get('server') || '';

        // 如果 Server 头为空，尝试从 HTML 标题获取
        if (!name) {
          return response.text().then(html => {
            const match = html.match(/<title>([^<]*)<\/title>/i);
            if (match) name = match[1].trim();
            return { ip, name: name || 'Unknown' };
          });
        } else {
          return { ip, name };
        }
      })
      .catch(() => {
        clearTimeout(timer);
        return null;  // 超时或网络错误
      });
  }

  /**
   * 扫描局域网（C 段），返回所有活动设备的 IP 和名称
   * @param {string} localIP 本机 IP（用于推断网段）
   * @param {number} concurrency 并发请求数
   * @returns {Promise<Array<{ip:string, name:string}>>}
   */
  async function scanNetwork(localIP, concurrency = 15) {
    // 假设子网掩码为 /24
    const prefix = localIP.substring(0, localIP.lastIndexOf('.') + 1);
    const ips = Array.from({ length: 254 }, (_, i) => prefix + (i + 1));

    const results = [];
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const promises = batch.map(ip => checkDevice(ip));
      const settled = await Promise.allSettled(promises);
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
    }
    return results;
  }

  // ===================== TurboWarp 扩展主类 =====================
  class NetworkScanner {
    getInfo() {
      return {
        id: 'networkscanner',
        name: '局域网扫描器',
        color1: '#3b8cbf',
        color2: '#2a6b91',
        blocks: [
          {
            opcode: 'getLocalIP',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取本机内网 IP',
            disableMonitor: false
          },
          {
            opcode: 'scanDevices',
            blockType: Scratch.BlockType.REPORTER,
            text: '扫描局域网设备列表 (IP: 名称)',
            disableMonitor: false
          }
        ]
      };
    }

    /**
     * 积木块：获取本机 IP
     */
    async getLocalIP() {
      try {
        const ip = await getLocalIP();
        return ip;
      } catch (e) {
        console.warn('Failed to get local IP:', e);
        return 'Error: ' + e.message;
      }
    }

    /**
     * 积木块：扫描设备列表
     * 返回一个字符串数组，每个元素格式为 "IP: 名称"
     */
    async scanDevices() {
      try {
        const localIP = await getLocalIP();
        const devices = await scanNetwork(localIP);
        // 格式化为 "IP: 名称" 的字符串列表
        return devices.map(d => `${d.ip}: ${d.name}`);
      } catch (e) {
        console.warn('Scan failed:', e);
        return ['扫描失败: ' + e.message];
      }
    }
  }

  Scratch.extensions.register(new NetworkScanner());
})(Scratch);