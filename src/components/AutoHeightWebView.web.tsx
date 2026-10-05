import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

interface AutoHeightWebViewProps {
  html: string;
  style?: unknown;
  minHeight?: number;
  scrollEnabled?: boolean;
  onHeightUpdated?: (height: number) => void;
}

export const AutoHeightWebView: React.FC<AutoHeightWebViewProps> = ({
  html,
  minHeight = 120,
  onHeightUpdated,
}) => {
  const [height, setHeight] = useState(minHeight);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only trust messages from our own iframe.
      if (event.source !== frameRef.current?.contentWindow) {
        return;
      }

      if (event.data?.type !== "height") {
        return;
      }

      const next = Math.max(
        minHeight,
        Math.ceil(Number(event.data.value) || 0),
      );
      setHeight(next);
      onHeightUpdated?.(next);
    };

    window.addEventListener("message", onMessage);

    return () => window.removeEventListener("message", onMessage);
  }, [minHeight, onHeightUpdated]);

  const srcDoc = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
<style>
*{box-sizing:border-box;max-width:100%;overflow-wrap:break-word;word-break:break-word}
html,body{margin:0;padding:0;background:transparent;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#171717}
@media(prefers-color-scheme:dark){body{color:#f5f5f5}}
#content{padding:2px;width:100%}
img{display:block;max-width:100%;height:auto;margin:auto}
table{display:block;width:100%;overflow-x:auto;border-collapse:collapse}
pre{white-space:pre-wrap}
.katex-display{overflow-x:auto;overflow-y:hidden}
</style>
</head>
<body>
<div id="content">${html}</div>
<script>
const wrapper=document.getElementById("content");
function sendHeight(){
  requestAnimationFrame(()=>{
    parent.postMessage({type:"height",value:Math.ceil(wrapper.getBoundingClientRect().height)},"*");
  });
}
window.addEventListener("load",()=>{
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
  new ResizeObserver(sendHeight).observe(wrapper);
  document.querySelectorAll("img").forEach(img=>img.addEventListener("load",sendHeight));
});
</script>
</body>
</html>`,
    [html],
  );

  return (
    <View style={{ width: "100%", height, minHeight }}>
      <iframe
        ref={frameRef}
        title="content"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        scrolling="no"
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          background: "transparent",
        }}
      />
    </View>
  );
};
