// 番茄小说 API 响应体净化脚本
// 递归移除短剧/福利/商城/广告等脏数据
(function() {
  var BLACKLIST = /short.video|drama|welfare|benefit|gold.coin|coin.center|red.packet|sign.in|task.center|mall.home|shop.home|game.center|mini.game|mini.drama|video.feed|video.tab|drama.center|shopping|mall|activity|invite|reward|gift|coupon|prize/i;
  
  var AD_KEYS = /^(ad|ads|ad_info|ad_data|ad_banner|insert_ad|splash_ad|reward_ad|video_ad|feed_ad|interstitial|banner|float_ad|popup_ad|recommend_ad)/i;
  
  var TAB_KEYS = /^(short_video|drama|welfare|benefit|gold_coin|coin_center|red_packet|sign_in|task_center|mall_home|shop_home|game_center|mini_game|mini_drama|video_feed|video_tab|drama_center|shopping|mall|activity|invite|reward|gift|prize|coupon)$/i;

  function clean(obj, depth) {
    depth = depth || 0;
    if (depth > 20) return obj;
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      var i = obj.length;
      while (i--) {
        var item = obj[i];
        // 过滤：元素本身是对象且 name/title/type 脏
        if (item && typeof item === 'object') {
          var n = item.name || item.title || item.type || '';
          if (BLACKLIST.test(n)) {
            obj.splice(i, 1);
            continue;
          }
        }
        // 递归
        obj[i] = clean(item, depth + 1);
      }
      return obj;
    }
    
    // 对象：遍历 key
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var val = obj[key];
      
      // 删除广告 key
      if (AD_KEYS.test(key) || TAB_KEYS.test(key)) {
        delete obj[key];
        continue;
      }
      
      // 删除值为脏字符串的 key
      if (typeof val === 'string' && BLACKLIST.test(val)) {
        delete obj[key];
        continue;
      }
      
      // 递归处理子对象/子数组
      if (val && typeof val === 'object') {
        obj[key] = clean(val, depth + 1);
      }
    }
    
    return obj;
  }

  // 主流程
  try {
    var body = JSON.parse($response.body);
    
    // 清空顶层所有的脏数据块
    body = clean(body, 0);
    
    // 二次清理：如果 data 字段存在，确保它被净化
    if (body.data && typeof body.data === 'object') {
      body.data = clean(body.data, 0);
      // 如果是数组，过滤掉 tab_type / module_type 匹配的
      if (Array.isArray(body.data)) {
        body.data = body.data.filter(function(item) {
          if (item && typeof item === 'object') {
            var t = item.tab_type || item.module_type || item.type || '';
            return !BLACKLIST.test(t);
          }
          return true;
        });
      }
    }
    
    // 三次清理：tab/columns/tabs/modules 这些常见的区块存放位置
    ['tabs', 'tab', 'columns', 'modules', 'sections', 'items', 'list'].forEach(function(field) {
      if (body[field] && Array.isArray(body[field])) {
        body[field] = body[field].filter(function(item) {
          if (item && typeof item === 'object') {
            var t = item.tab_type || item.module_type || item.type || item.name || item.title || '';
            return !BLACKLIST.test(t);
          }
          return true;
        });
      }
    });
    
    $done({ body: JSON.stringify(body) });
  } catch (e) {
    // 非 JSON 响应或解析失败，原样放行
    $done({});
  }
})();
