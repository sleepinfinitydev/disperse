const ENGINES = [
  { id: 'actdiag', label: 'actdiag', mode: 'dot' },
  { id: 'blockdiag', label: 'blockdiag', mode: 'dot' },
  { id: 'bpmn', label: 'bpmn', mode: 'xml' },
  { id: 'bytefield', label: 'bytefield', mode: 'clojure' },
  { id: 'c4plantuml', label: 'c4plantuml', mode: 'text' },
  { id: 'd2', label: 'd2', mode: 'yaml' },
  { id: 'dbml', label: 'dbml', mode: 'sql' },
  { id: 'ditaa', label: 'ditaa', mode: 'text' },
  { id: 'erd', label: 'erd', mode: 'ini' },
  { id: 'excalidraw', label: 'excalidraw', mode: 'json' },
  { id: 'graphviz', label: 'graphviz', mode: 'dot' },
  { id: 'mermaid', label: 'mermaid', mode: 'yaml' },
  { id: 'nomnoml', label: 'nomnoml', mode: 'text' },
  { id: 'nwdiag', label: 'nwdiag', mode: 'dot' },
  { id: 'packetdiag', label: 'packetdiag', mode: 'dot' },
  { id: 'pikchr', label: 'pikchr', mode: 'c_cpp' },
  { id: 'plantuml', label: 'plantuml', mode: 'text' },
  { id: 'rackdiag', label: 'rackdiag', mode: 'dot' },
  { id: 'seqdiag', label: 'seqdiag', mode: 'dot' },
  { id: 'structurizr', label: 'structurizr', mode: 'csharp' },
  { id: 'svgbob', label: 'svgbob', mode: 'text' },
  { id: 'symbolator', label: 'symbolator', mode: 'verilog' },
  { id: 'tikz', label: 'tikz', mode: 'latex' },
  { id: 'umlet', label: 'umlet', mode: 'xml' },
  { id: 'vega', label: 'vega', mode: 'json' },
  { id: 'vegalite', label: 'vegalite', mode: 'json' },
  { id: 'wavedrom', label: 'wavedrom', mode: 'json' },
  { id: 'wireviz', label: 'wireviz', mode: 'yaml' }
];

const DEFAULT_EXAMPLES = {
  actdiag: `actdiag {
  write -> convert -> image
  lane user {
    label = "User"
    write [label = "Write text"];
    image [label = "Get diagram"];
  }
  lane kroki {
    convert [label = "Convert text to image"];
  }
}`,
  blockdiag: `blockdiag {
  Kroki -> generates -> "Block diagrams";
  Kroki -> is -> "very easy!";
  Kroki [color = "greenyellow"];
  "Block diagrams" [color = "pink"];
  "very easy!" [color = "orange"];
}`,
  bpmn: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="false">
    <startEvent id="StartEvent_1" name="Start"/>
    <task id="Task_1" name="Render Diagram"/>
    <endEvent id="EndEvent_1" name="Done"/>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <omgdc:Bounds x="150" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <omgdc:Bounds x="240" y="78" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <omgdc:Bounds x="400" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <omgdi:waypoint x="186" y="118"/>
        <omgdi:waypoint x="240" y="118"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <omgdi:waypoint x="340" y="118"/>
        <omgdi:waypoint x="400" y="118"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`,
  bytefield: `(defattrs :bg-green {:fill "#a0ffa0"})
(draw-column-headers)
(draw-box "Address" [{:span 4} :bg-green])
(draw-box "Data" {:span 12})`,
  c4plantuml: `@startuml
!include <C4/C4_Container>

Person(user, "User", "Creates diagrams as code")
System_Boundary(disperse, "Disperse") {
  Container(spa, "Web SPA", "Vanilla JS", "Edits and previews diagrams")
}
System_Ext(kroki, "Kroki API", "Renders diagrams")

Rel(user, spa, "Uses")
Rel(spa, kroki, "Requests SVG/PNG", "HTTPS")
@enduml`,
  d2: `direction: right
Disperse -> Kroki: Compress + Encode
Kroki -> Disperse: SVG / PNG`,
  dbml: `Table users {
  id integer [primary key]
  username varchar
  role varchar
  created_at timestamp
}

Table diagrams {
  id integer [primary key]
  title varchar
  engine varchar
  user_id integer [ref: > users.id]
}`,
  ditaa: `+----------+   +---------+   +----------+
| Disperse |-->|  Kroki  |-->| Diagram  |
|  Editor  |   | Service |   | SVG/PNG  |
+----------+   +---------+   +----------+`,
  erd: `[User]
*id
username
email

[Diagram]
*id
+user_id
engine
content

User 1--* Diagram`,
  excalidraw: `{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "type": "rectangle",
      "id": "rect-1",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 90,
      "angle": 0,
      "strokeColor": "#0080c0",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "seed": 12345,
      "version": 1,
      "versionNonce": 12345,
      "isDeleted": false
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}`,
  graphviz: `digraph G {
  rankdir=LR;
  node [shape=box, style="rounded,filled", fillcolor="#e3f2fd", color="#0080c0"];
  Disperse -> Kroki [label="deflate + base64"];
  Kroki -> Viewer [label="SVG / PNG"];
}`,
  mermaid: `flowchart LR
  A[Code Editor] -->|Deflate + Base64| B(Kroki API)
  B --> C{Format}
  C -->|SVG| D[Vector Preview]
  C -->|PNG| E[Raster Preview]`,
  nomnoml: `[<actor>User] -> [Disperse]
[Disperse] -> [Kroki API]
[Kroki API] --> [SVG / PNG]`,
  nwdiag: `nwdiag {
  network dmz {
    address = "210.x.x.x/24"
    web01 [address = "210.x.x.1"];
    web02 [address = "210.x.x.2"];
  }
}`,
  packetdiag: `packetdiag {
  colwidth = 16;
  node_height = 60;
  0-7: Source Port;
  8-15: Destination Port;
  16-31: Sequence Number;
}`,
  pikchr: `arrow right 200% "Code" "UTF-8"
box rad 10px "Disperse" "(SPA)" fit
arrow right 200% "Kroki" "URL"
box rad 10px "SVG / PNG" fit`,
  plantuml: `@startuml
skinparam monochrome false
actor User
participant Disperse
participant Kroki

User -> Disperse: Write diagram code
Disperse -> Kroki: GET /engine/format/payload
Kroki --> Disperse: Rendered SVG / PNG
@enduml`,
  rackdiag: `rackdiag {
  16U;
  1: UPS [2U];
  3: DB Server [2U];
  5: Web Server [1U];
  6: Switch [1U];
}`,
  seqdiag: `seqdiag {
  browser  -> webserver [label = "GET /index.html"];
  browser <-- webserver;
  browser  -> kroki [label = "GET /mermaid/svg/..."];
  browser <-- kroki;
}`,
  structurizr: `workspace {
  model {
    user = person "User"
    disperse = softwareSystem "Disperse"
    kroki = softwareSystem "Kroki"
    user -> disperse "Edits diagrams"
    disperse -> kroki "Renders diagrams"
  }
  views {
    systemContext disperse {
      include *
      autolayout lr
    }
  }
}`,
  svgbob: ` +----------+      +---------+      +---------+
 | Disperse | ---> |  Kroki  | ---> | Diagram |
 +----------+      +---------+      +---------+`,
  symbolator: `module disperse_counter (
  input wire clk,
  input wire rst,
  output reg [7:0] count
);
endmodule`,
  tikz: `\\documentclass[tikz,border=4pt]{standalone}
\\begin{document}
\\begin{tikzpicture}
  \\node[draw, rounded corners, fill=blue!10] (a) at (0,0) {Disperse};
  \\node[draw, rounded corners, fill=green!10] (b) at (3,0) {Kroki};
  \\draw[->, thick] (a) -- (b);
\\end{tikzpicture}
\\end{document}`,
  umlet: `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<diagram program="umlet" version="14.3.0">
  <zoom_level>10</zoom_level>
  <element>
    <id>UMLClass</id>
    <coordinates><x>40</x><y>40</y><w>140</w><h>70</h></coordinates>
    <panel_attributes>Disperse
--
+engine: String
+format: String</panel_attributes>
    <additional_attributes/>
  </element>
</diagram>`,
  vega: `{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "width": 300,
  "height": 160,
  "padding": 5,
  "data": [
    {
      "name": "table",
      "values": [
        {"category": "A", "amount": 28},
        {"category": "B", "amount": 55},
        {"category": "C", "amount": 43},
        {"category": "D", "amount": 91}
      ]
    }
  ],
  "scales": [
    {
      "name": "xscale",
      "type": "band",
      "domain": {"data": "table", "field": "category"},
      "range": "width",
      "padding": 0.15
    },
    {
      "name": "yscale",
      "domain": {"data": "table", "field": "amount"},
      "nice": true,
      "range": "height"
    }
  ],
  "axes": [
    {"orient": "bottom", "scale": "xscale"},
    {"orient": "left", "scale": "yscale"}
  ],
  "marks": [
    {
      "type": "rect",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "x": {"scale": "xscale", "field": "category"},
          "width": {"scale": "xscale", "band": 1},
          "y": {"scale": "yscale", "field": "amount"},
          "y2": {"scale": "yscale", "value": 0},
          "fill": {"value": "#0080c0"}
        }
      }
    }
  ]
}`,
  vegalite: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Simple bar chart",
  "width": 240,
  "height": 150,
  "data": {
    "values": [
      {"a": "P", "b": 38},
      {"a": "S", "b": 62},
      {"a": "T", "b": 49},
      {"a": "Q", "b": 75}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal"},
    "y": {"field": "b", "type": "quantitative"}
  }
}`,
  wavedrom: `{ "signal": [
  { "name": "clk",  "wave": "p.....|..." },
  { "name": "data", "wave": "x.345x|=.x", "data": ["head", "body", "tail", "data"] },
  { "name": "req",  "wave": "0.1..0|1.0" }
]}`,
  wireviz: `connectors:
  X1:
    type: D-Sub
    subtype: female
    pinlabels: [DCD, RX, TX, DTR, GND]
  X2:
    type: Molex KK 254
    pinlabels: [GND, RX, TX]
cables:
  W1:
    gauge: 0.25 mm2
    length: 0.2
    color_code: DIN
    wirecount: 3
connections:
  -
    - X1: [5, 2, 3]
    - W1: [1, 2, 3]
    - X2: [1, 3, 2]`
};

function textToBase64UrlSafe(text) {
  const utf8 = new TextEncoder().encode(text);
  const compressed = pako.deflate(utf8, { level: 9 });
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < compressed.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, compressed.subarray(i, i + chunkSize));
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlSafeToText(base64UrlSafe) {
  let base64 = base64UrlSafe.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const compressed = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    compressed[i] = binary.charCodeAt(i);
  }
  const utf8 = pako.inflate(compressed);
  return new TextDecoder('utf-8').decode(utf8);
}

window.kroki = {
  ENGINES,
  DEFAULT_EXAMPLES,
  encode: textToBase64UrlSafe,
  decode: base64UrlSafeToText,
  getEngineInfo(engineId) {
    return ENGINES.find((e) => e.id === engineId) || { id: engineId, label: engineId, mode: 'text' };
  },
  buildUrl(engine, format, payload) {
    return `https://kroki.io/${engine}/${format}/${payload}`;
  }
};
