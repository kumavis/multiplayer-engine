// webrtc polyfill
if (!process.browser) {
  const webrtc = require('wrtc')
  // rtc-tools is an idiot
  window = global
  global.RTCIceCandidate = webrtc.RTCIceCandidate
  global.RTCPeerConnection = webrtc.RTCPeerConnection
  global.RTCSessionDescription = webrtc.RTCSessionDescription
}