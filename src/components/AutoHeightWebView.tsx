// src/components/AutoHeightWebView.tsx

import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

interface AutoHeightWebViewProps {
  html: string;
  style?: StyleProp<ViewStyle>;
  minHeight?: number;
  scrollEnabled?: boolean;
  onHeightUpdated?: (height: number) => void;
}

export const AutoHeightWebView: React.FC<AutoHeightWebViewProps> = ({
  html,
  style,
  minHeight = 120,
  scrollEnabled = false,
  onHeightUpdated,
}) => {
  const [height, setHeight] = useState(minHeight);
  const [loading, setLoading] = useState(true);

  const lastHeight = useRef(minHeight);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type !== "height") return;

        const newHeight = Math.max(
          minHeight,
          Math.ceil(Number(data.value) || minHeight),
        );

        if (Math.abs(newHeight - lastHeight.current) < 2) return;

        lastHeight.current = newHeight;
        setHeight(newHeight);
        onHeightUpdated?.(newHeight);
      } catch {}
    },
    [minHeight, onHeightUpdated],
  );

  const htmlContent = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>

<meta
name="viewport"
content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
/>

<link
rel="stylesheet"
href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
/>

<script defer
src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>

<script defer
src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>

<style>

*{
box-sizing:border-box;
max-width:100%;
overflow-wrap:break-word;
word-wrap:break-word;
word-break:break-word;
}

html,
body{
margin:0;
padding:0;
background:transparent;
overflow:hidden;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
font-size:16px;
line-height:1.6;
color:#171717;
}

@media(prefers-color-scheme:dark){
body{
color:#f5f5f5;
}
}

#content{
padding:2px;
width:100%;
overflow:visible;
min-height:fit-content;
height:auto;
}

img{
display:block;
max-width:100%;
height:auto;
margin:auto;
}

table{
display:block;
width:100%;
overflow-x:auto;
border-collapse:collapse;
}

pre{
white-space:pre-wrap;
}

.katex-display{
overflow-x:auto;
overflow-y:hidden;
}

</style>

</head>

<body>

<div id="content">

${html}

</div>

<script>

const wrapper=document.getElementById("content");

function sendHeight(){

requestAnimationFrame(()=>{

const h=Math.ceil(wrapper.getBoundingClientRect().height);

window.ReactNativeWebView.postMessage(
JSON.stringify({
type:"height",
value:h
}));

});

}

window.addEventListener("load",sendHeight);

document.addEventListener("DOMContentLoaded",()=>{

if(window.renderMathInElement){

renderMathInElement(document.body,{
delimiters:[
{left:"$$",right:"$$",display:true},
{left:"$",right:"$",display:false},
{left:"\\\\(",right:"\\\\)",display:false},
{left:"\\\\[",right:"\\\\]",display:true}
],
throwOnError:false
});

}

sendHeight();

const resizeObserver=new ResizeObserver(sendHeight);

resizeObserver.observe(wrapper);

const mutationObserver=new MutationObserver(sendHeight);

mutationObserver.observe(wrapper,{
childList:true,
subtree:true,
attributes:true
});

document.querySelectorAll("img").forEach(img=>{

if(img.complete){

sendHeight();

}else{

img.addEventListener("load",sendHeight);

}

});

window.addEventListener("resize",sendHeight);

});

</script>

</body>
</html>
`,
    [html],
  );

  return (
    <View
      style={[
        styles.container,
        {
          height,
          minHeight,
        },
        style,
      ]}
    >
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={scrollEnabled}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
        containerStyle={styles.webview}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#4f46e5" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
