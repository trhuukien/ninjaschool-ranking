// Pixel-for-pixel copy of the game's grey window frame ornaments, traced
// from an in-game screenshot. Each sprite is a grid of palette keys; "." is
// transparent. Drawn as one SVG path per colour with crisp edges.

const PALETTE: Record<string, string> = {
  "0": "#080707",
  "1": "#3b3735",
  "2": "#575757",
  "3": "#808181",
  "4": "#adaeaf",
  "5": "#dadbdb",
};

/** The straight frame edge, outside to inside, in px. */
export const FRAME_EDGE = [PALETTE["1"], PALETTE["4"], PALETTE["4"], PALETTE["1"]];

// Top-left corner; the other three corners are this one mirrored.
const CORNER = [
  "11111111222211111111111111111111111111",
  "13444444531255554444224444312344444444",
  "14555555551455555555225555512554444444",
  "14421111541352111145225413512531111111",
  "25512223542453222145225424523531......",
  "25513555555555554145225555555531......",
  "25513543443453354145212324433321......",
  "25513521540352154145211113521.........",
  "2555555455455555414544444552..........",
  "24445554554555554124444444421.........",
  "2111352154135211111111111111..........",
  "223345335434521.......................",
  "255555555555521.......................",
  "255235325433211.......................",
  "25513521541...........................",
  "25513555541...........................",
  "25412444431...........................",
  "25411111111...........................",
  "24533333331...........................",
  "24555555541...........................",
  "12222222541...........................",
  "11112211541...........................",
  "14555521541...........................",
  "14544521541...........................",
  "14412521541...........................",
  "14534533541...........................",
  "14555545531...........................",
  "11213522221...........................",
  "11213521..............................",
  "14555521..............................",
  "14543321..............................",
  "14411111..............................",
  "1442..................................",
  "1442..................................",
  "1442..................................",
  "1442..................................",
];

// Endless knot on the middle of the top edge. Row 8 is the frame's top edge;
// the rows above stick out over it. "0" there is the scenery behind, so it is
// transparent too.
const KNOT = [
  "00000000000000000000110000013541000001100000000000000000000",
  "00000000000000000012331000145455200013421000000000000000000",
  "00000000000111000024553001453125520025552000001100000000000",
  "00000000001342000035542124531002552124553100023310000000000",
  "00000001112453000035311125520001453111254100025531110000000",
  "00000012334431001135410012552124531001354211013443332100000",
  "01100134454311124455531000245345210013555443111244443200110",
  "12321244345311244333454100015552000135533345311244344312332",
  "344444421232124311.114541113555411135421..13421232124444554",
  "54434431..111342.....13542454135423541.....144111..13454455",
  "54213541...125421121..1355531.1355531...11114531...13542145",
  "22111453222345542442111155521111555211124423554322234421123",
  ".....145444542555552.12553552125534531.2555553354444421....",
  "......145553112555311255212554552114521135543112455421.....",
  ".......12221...2221.13521.1155521..1541.12211..12221.......",
  "....................1451..1355541..1451....................",
  "....................1353114541355212541....................",
  ".....................14545531.13554552.....................",
  "......................235431...1245421.....................",
  ".......................1111......111.......................",
];

/** One path per palette colour, built from horizontal runs. */
function spritePaths(rows: string[]) {
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (PALETTE[key]) paths[key] = (paths[key] ?? "") + `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return Object.entries(paths);
}

const CORNER_PATHS = spritePaths(CORNER);
const KNOT_PATHS = spritePaths(KNOT.map((r) => r.replace(/0/g, ".")));
const CORNER_WIDTH = CORNER[0].length;
const CORNER_HEIGHT = CORNER.length;
const KNOT_WIDTH = KNOT[0].length;

function Sprite({
  paths,
  width,
  height,
  style,
}: {
  paths: [string, string][];
  width: number;
  height: number;
  style: React.CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      shapeRendering="crispEdges"
      className="pointer-events-none absolute"
      style={style}
      aria-hidden
    >
      {paths.map(([key, d]) => (
        <path key={key} d={d} fill={PALETTE[key]} />
      ))}
    </svg>
  );
}

/** Corner ornaments and the top knot, laid over a box whose edge is FRAME_EDGE. */
export function FrameOrnaments() {
  const corner = (style: React.CSSProperties) => (
    <Sprite paths={CORNER_PATHS} width={CORNER_WIDTH} height={CORNER_HEIGHT} style={style} />
  );
  return (
    <>
      {corner({ left: 0, top: 0 })}
      {corner({ right: 0, top: 0, transform: "scaleX(-1)" })}
      {corner({ left: 0, bottom: 0, transform: "scaleY(-1)" })}
      {corner({ right: 0, bottom: 0, transform: "scale(-1, -1)" })}
      <Sprite
        paths={KNOT_PATHS}
        width={KNOT_WIDTH}
        height={KNOT.length}
        style={{ left: "50%", top: -8, marginLeft: -Math.floor(KNOT_WIDTH / 2) }}
      />
    </>
  );
}
