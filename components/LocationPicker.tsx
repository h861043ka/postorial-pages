// 位置情報ピッカー（Leaflet地図で場所を選択 - Web/Native両対応）
import React, { useState, useRef, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  visible: boolean;
  initialLocation?: LocationData | null;
  onSelect: (location: LocationData) => void;
  onClose: () => void;
}

export default function LocationPicker({ visible, initialLocation, onSelect, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const iframeRef = useRef<any>(null);
  const webviewRef = useRef<any>(null);

  const defaultLat = initialLocation?.lat || 35.6762;
  const defaultLng = initialLocation?.lng || 139.6503;

  // モーダル表示時に初期位置をセット
  useEffect(() => {
    if (visible) {
      setSelectedLocation(initialLocation || null);
      setSearchQuery("");
    }
  }, [visible, initialLocation]);

  // iframeからのメッセージを受信（Web専用）
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "locationSelected") {
          setSelectedLocation({
            lat: data.lat,
            lng: data.lng,
            name: data.name || `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`,
          });
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [visible]);

  // WebViewからのメッセージを受信（Native専用）
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "locationSelected") {
        setSelectedLocation({
          lat: data.lat,
          lng: data.lng,
          name: data.name || `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`,
        });
      }
    } catch {}
  };

  // WebViewにメッセージを送信
  const postToMap = (msg: object) => {
    const json = JSON.stringify(msg);
    if (Platform.OS === "web") {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(json, "*");
      }
    } else {
      webviewRef.current?.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(json)}}));true;`
      );
    }
  };

  // 場所検索
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    postToMap({ type: "search", query: searchQuery.trim() });
  };

  // 現在地取得
  const handleCurrentLocation = async () => {
    setLoadingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      postToMap({
        type: "moveTo",
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch (e) {
      console.error("GPS取得エラー:", e);
    } finally {
      setLoadingGPS(false);
    }
  };

  // 場所確定
  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
    }
    onClose();
  };

  // Leaflet地図のHTML（Native用はwindow.ReactNativeWebView.postMessageを使用）
  const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>*{margin:0;padding:0}#map{width:100%;height:100vh}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map').setView([${defaultLat},${defaultLng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap',maxZoom:19
}).addTo(map);

var marker=L.marker([${defaultLat},${defaultLng}],{draggable:true}).addTo(map);

function postMsg(obj){
  var s=JSON.stringify(obj);
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(s);
  }else{
    parent.postMessage(s,'*');
  }
}

function sendLoc(lat,lng){
  fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lng+'&format=json&accept-language=ja&zoom=16')
  .then(function(r){return r.json()})
  .then(function(d){
    var name=d.display_name||(lat.toFixed(4)+', '+lng.toFixed(4));
    postMsg({type:'locationSelected',lat:lat,lng:lng,name:name});
  })
  .catch(function(){
    postMsg({type:'locationSelected',lat:lat,lng:lng,name:lat.toFixed(4)+', '+lng.toFixed(4)});
  });
}

marker.on('dragend',function(e){
  var p=e.target.getLatLng();sendLoc(p.lat,p.lng);
});

map.on('click',function(e){
  marker.setLatLng(e.latlng);sendLoc(e.latlng.lat,e.latlng.lng);
});

window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='search'){
      fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(d.query)+'&format=json&limit=1&accept-language=ja')
      .then(function(r){return r.json()})
      .then(function(res){
        if(res.length>0){
          var lat=parseFloat(res[0].lat),lng=parseFloat(res[0].lon);
          map.setView([lat,lng],15);marker.setLatLng([lat,lng]);
          sendLoc(lat,lng);
        }
      });
    }else if(d.type==='moveTo'){
      map.setView([d.lat,d.lng],15);marker.setLatLng([d.lat,d.lng]);
      sendLoc(d.lat,d.lng);
    }
  }catch(ex){}
});

sendLoc(${defaultLat},${defaultLng});
<\/script>
</body>
</html>`;

  // Native用WebViewコンポーネント（動的インポートで型エラー回避）
  const renderMap = () => {
    if (Platform.OS === "web") {
      return React.createElement("iframe", {
        ref: iframeRef,
        srcDoc: mapHtml,
        style: { width: "100%", height: "100%", border: "none" },
      });
    }
    // Native: react-native-webview（Expo Goでは使えないためフォールバック）
    try {
      const WebView = require("react-native-webview").default;
      return (
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
        />
      );
    } catch {
      // react-native-webviewが利用できない場合（Expo Go等）
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
          <Ionicons name="map-outline" size={48} color="#8e8e93" />
          <Text style={{ color: "#8e8e93", fontSize: 14, marginTop: 12, textAlign: "center", paddingHorizontal: 20 }}>
            {"地図表示にはDevelopment Buildが必要です。\n現在地ボタンで位置を取得できます。"}
          </Text>
        </View>
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#14171a" />
          </TouchableOpacity>
          <Text style={styles.title}>場所を選択</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmBtn, !selectedLocation && styles.confirmBtnDisabled]}
            disabled={!selectedLocation}
          >
            <Text style={[styles.confirmBtnText, !selectedLocation && { opacity: 0.5 }]}>決定</Text>
          </TouchableOpacity>
        </View>

        {/* 検索バー */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#8e8e93" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="場所を検索..."
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#8e8e93" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 選択中の場所 */}
        {selectedLocation ? (
          <View style={styles.selectedBar}>
            <Ionicons name="location" size={16} color="#1d9bf0" />
            <Text style={styles.selectedText} numberOfLines={1}>{selectedLocation.name}</Text>
          </View>
        ) : null}

        {/* 地図 */}
        <View style={styles.mapContainer}>
          {renderMap()}

          {/* 現在地ボタン */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleCurrentLocation}
            disabled={loadingGPS}
          >
            {loadingGPS ? (
              <ActivityIndicator size="small" color="#1d9bf0" />
            ) : (
              <Ionicons name="navigate" size={22} color="#1d9bf0" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  headerBtn: { width: 36 },
  title: { fontSize: 17, fontWeight: "bold", color: "#14171a" },
  confirmBtn: {
    backgroundColor: "#1d9bf0",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#14171a",
    paddingVertical: 0,
  },
  selectedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(29,155,240,0.08)",
    borderRadius: 8,
  },
  selectedText: {
    flex: 1,
    fontSize: 13,
    color: "#1d9bf0",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  gpsBtn: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
