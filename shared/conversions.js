/**
 * conversions.js
 * 72种转换关系注册表 + 步骤元数据
 * 每条转换记录：{ src, dst, steps: [{id, label, sub, brief}] }
 *
 * 渲染函数通过 REGISTER_RENDERER 在 formats/ 和 common/ 中注册
 */

// ─── 渲染函数注册表 ───
const STEP_RENDERERS = {};

function REGISTER_RENDERER(id, fn) {
  STEP_RENDERERS[id] = fn;
}

// 源格式列表（可互转的 12 种格式）
const SRC_FORMATS = ['BMP','JPEG','PNG','GIF','WebP','AVIF','HEIF','TIFF','SVG','ICO','TGA','PNM'];
// 目标格式列表
const DST_FORMATS = ['JPEG','PNG','GIF','WebP','AVIF','HEIF','TIFF','SVG','BMP','ICO','TGA','PNM'];

// ─────────────────────────────────────────────
// 可复用步骤片段（只记元数据，render函数在steps/目录）
// ─────────────────────────────────────────────
const STEP_FRAGMENTS = {
  parseBMP: {
    id:'parseBMP', label:'解析 BMP 文件', sub:'文件头·信息头·像素矩阵',
    brief:'读取 BMP 文件头（14B）和信息头（40B），提取宽高、位深度，去掉每行 4 字节对齐填充，将 BGR 像素顺序转为 RGB，得到 RGB(A) 像素矩阵。'
  },
  parseJPEG: {
    id:'parseJPEG', label:'解码 JPEG 文件', sub:'哈夫曼解码·反量化·IDCT',
    brief:'读取 JFIF 段结构，哈夫曼解码得到量化 DCT 系数，反量化后做 IDCT，重组 YCbCr 分量。'
  },
  parsePNG: {
    id:'parsePNG', label:'解码 PNG 文件', sub:'Deflate·反滤波·像素重建',
    brief:'读取 PNG 块结构（IHDR/IDAT/IEND），对 IDAT 做 Deflate 解压，逐行做反滤波（Un-filter），得到 RGB(A) 像素矩阵。'
  },
  parseGIF: {
    id:'parseGIF', label:'解码 GIF 文件', sub:'LZW解压·调色板·索引映射',
    brief:'读取 GIF 文件头、逻辑屏幕描述、全局/局部调色板，LZW 解压索引流，将每个像素索引映射回 RGB 颜色值。'
  },
  parseWebP: {
    id:'parseWebP', label:'解码 WebP 文件', sub:'VP8/VP8L·YUV/RGBA恢复',
    brief:'解析 RIFF 容器，有损 VP8 解码：反量化→IDCT→YUV→RGB；无损 VP8L 解码：空间预测→颜色变换→RGBA。'
  },
  parseAVIF: {
    id:'parseAVIF', label:'解码 AVIF 文件', sub:'ISOBMFF·AV1解码',
    brief:'解析 ISOBMFF（MP4）容器，提取 AV1 位流，解码 intra 帧，YUV→RGB，若含 Alpha 单独解码后合成。'
  },
  parseHEIF: {
    id:'parseHEIF', label:'解码 HEIF/HEIC 文件', sub:'ISOBMFF·HEVC解码',
    brief:'解析 ISOBMFF 容器，提取 HEVC 位流，反 CABAC 熵编码→反量化→IDCT→去环路滤波→YUV→RGB。'
  },
  parseTIFF: {
    id:'parseTIFF', label:'解析 TIFF 文件', sub:'IFD·条带解压·像素重建',
    brief:'读取 TIFF 目录（IFD）中的元数据标签，定位条带（Strip）或瓦片（Tile）数据，按压缩类型（无压缩/LZW/ZIP/JPEG）解压，得到 RGB(A) 像素。'
  },
  parseSVG: {
    id:'parseSVG', label:'解析与光栅化 SVG', sub:'XML解析·矢量渲染·像素缓冲',
    brief:'XML 解析 SVG DOM，处理坐标变换、CSS 样式，用矢量渲染引擎（Cairo/Skia）按指定输出分辨率绘制到 RGBA 像素缓冲区，透明区域需设置背景色（转 JPEG 等格式时）。'
  },
  upsampling: {
    id:'upsample', label:'色度上采样', sub:'双线性插值·Cb/Cr还原',
    brief:'若源 JPEG 使用 4:2:0 或 4:2:2 色度下采样，需将 Cb/Cr 平面用双线性插值放大回原始分辨率，再与 Y 通道合并。'
  },
  ycbcrToRgb: {
    id:'ycbcr2rgb', label:'色彩空间反转换', sub:'YCbCr → RGB·钳位',
    brief:'用 BT.601 逆公式：R = Y+1.402(Cr-128)，G = Y-0.3441(Cb-128)-0.7141(Cr-128)，B = Y+1.772(Cb-128)，结果钳位到 [0,255]。'
  },
  rgbToYcbcr: {
    id:'rgb2ycbcr', label:'色彩空间转换', sub:'RGB → YCbCr·BT.601',
    brief:'ITU-R BT.601 标准：Y=0.299R+0.587G+0.114B，Cb=-0.1687R-0.3313G+0.5B+128，Cr=0.5R-0.4187G-0.0813B+128，利用人眼对亮度敏感的特性分离亮度与色度。'
  },
  chromaSubsample: {
    id:'subsample', label:'色度下采样', sub:'4:4:4 / 4:2:2 / 4:2:0',
    brief:'对 Cb/Cr 平面做空间降采样，JPEG 常用 4:2:0（2×2块平均），数据量减少约 50%。'
  },
  dct: {
    id:'dct', label:'分块与 DCT 变换', sub:'8×8块·二维DCT-II',
    brief:'将各分量切成 8×8 块，每块像素减 128 后做二维 DCT-II，把空间域信息转换到频率域，能量集中到左上角低频区。'
  },
  quantize: {
    id:'quant', label:'量化', sub:'量化矩阵·质量因子·有损核心',
    brief:'DCT 系数除以量化矩阵对应位置的步长并取整，高频系数大量归零。质量因子（1-100）通过缩放量化矩阵控制精度。'
  },
  entropy: {
    id:'entropy', label:'熵编码', sub:'Zig-Zag·DC差分·AC游程·哈夫曼',
    brief:'Zig-Zag 扫描将 8×8 系数排成一维，DC 系数差分编码，AC 系数游程+幅值编码，最终用哈夫曼变长码输出比特流。'
  },
  packJPEG: {
    id:'packJPEG', label:'封装为 JPEG 文件', sub:'JFIF段结构·SOI→EOI',
    brief:'按 JFIF 规范写入 SOI(FFD8)、APP0、DQT、SOF0、DHT、SOS 等标记段及压缩比特流，最后写 EOI(FFD9)，生成 .jpg 文件。'
  },
  pngFilter: {
    id:'pngFilter', label:'PNG 行滤波器', sub:'None/Sub/Up/Average/Paeth',
    brief:'对每行像素选择最优滤波器（无滤波、左邻差分 Sub、上行差分 Up、平均 Average、Paeth 预测），使数据更易被 Deflate 压缩，减小文件体积。'
  },
  deflate: {
    id:'deflate', label:'Deflate 压缩', sub:'LZ77滑动窗口·哈夫曼·ZLIB包装',
    brief:'Deflate = LZ77（重复字符串引用）+ 哈夫曼编码（变长编码），PNG 将其包装在 zlib 格式（adler32 校验和）中输出 IDAT 块。'
  },
  packPNG: {
    id:'packPNG', label:'封装为 PNG 文件', sub:'PNG签名·IHDR·IDAT·IEND',
    brief:'写入 PNG 文件签名（8B），然后依次写 IHDR（宽高/位深/颜色类型）、IDAT（Deflate 压缩数据）、IEND（结束块），每块含 CRC32 校验。'
  },
  colorQuant: {
    id:'colorQuant', label:'颜色量化', sub:'256色·中位切分/八叉树·调色板',
    brief:'将真彩色图像压缩到最多 256 种颜色，生成全局调色板。常用算法：中位切分（Median Cut）、八叉树量化（Octree）。量化误差可用误差扩散（Floyd-Steinberg 抖动）缓解。'
  },
  lzwCompress: {
    id:'lzwCompress', label:'LZW 编码（GIF）', sub:'变长码·字典扩展',
    brief:'GIF 的 LZW 以调色板索引流为输入，维护一个动态字典，遇到新组合则加入字典，字典满时输出清除码重新建表，实现无损压缩。'
  },
  packGIF: {
    id:'packGIF', label:'封装为 GIF 文件', sub:'GIF89a·逻辑屏幕描述·图像块',
    brief:'写入 GIF89a 文件头，逻辑屏幕描述（宽高/颜色深度/全局调色板标志），全局调色板，图像描述符，LZW 压缩数据块，文件结束符（0x3B）。'
  },
  webpEncode: {
    id:'webpEncode', label:'WebP 编码', sub:'VP8有损 / VP8L无损',
    brief:'有损模式（VP8）：RGB→YUV、分块预测、DCT/WHT 变换、量化、算术编码，封装进 RIFF 容器。无损模式（VP8L）：空间颜色预测、颜色缓存、LZ77+哈夫曼，无 YUV 转换，支持 RGBA。'
  },
  packWebP: {
    id:'packWebP', label:'封装为 WebP 文件', sub:'RIFF容器·VP8/VP8L块',
    brief:'以 RIFF 格式写入：RIFF 头（文件大小）、WEBP 标识、VP8/VP8L/VP8X 块（含编码数据）、可选 EXIF/XMP 元数据块。'
  },
  avifEncode: {
    id:'avifEncode', label:'AVIF / AV1 编码', sub:'帧内预测·变换·量化·算术编码',
    brief:'将 YUV（或 RGB）送入 AV1 编码器（如 libaom/libavif），进行帧内预测、超级块分割、DCT/ADST/DST 变换、量化、ANS 算术编码；Alpha 单独编码。'
  },
  packAVIF: {
    id:'packAVIF', label:'封装为 AVIF 文件', sub:'ISOBMFF·ftyp·mdat',
    brief:'将 AV1 位流封装在 ISOBMFF 容器中：写 ftyp（avif/avis）、moov（元数据）、mdat（AV1 位流），Alpha 通道放置在辅助 item 中。'
  },
  hevcEncode: {
    id:'hevcEncode', label:'HEVC 编码', sub:'CTU分块·预测·CABAC·环路滤波',
    brief:'将 YUV 送入 HEVC 编码器（x265/libheif），进行帧内/帧间预测、CTU 分割、DCT/DST 变换、量化、CABAC 熵编码，最后做去块效应与 SAO 环路滤波。'
  },
  packHEIF: {
    id:'packHEIF', label:'封装为 HEIF/HEIC 文件', sub:'ISOBMFF·ItemLocation·HEVC流',
    brief:'以 ISOBMFF 为容器：写 ftyp（heic）、mdat（HEVC 位流）、moov/meta（ItemLocation、ItemProperties 等元数据），Alpha 作为辅助 item 存储。'
  },
  tiffEncode: {
    id:'tiffEncode', label:'TIFF 压缩编码', sub:'LZW / ZIP / PackBits / 无压缩',
    brief:'TIFF 支持多种压缩方式：无压缩（原始像素）、PackBits（简单 RLE）、LZW（字典压缩）、Deflate/ZIP（zlib），也可选 JPEG 压缩（二次有损）。每种条带/瓦片独立压缩。'
  },
  packTIFF: {
    id:'packTIFF', label:'封装为 TIFF 文件', sub:'IFD·标签表·条带偏移',
    brief:'写入 TIFF 头（字节序标识 II/MM + 魔数42 + IFD偏移），构建 IFD（每条目 12B：标签/类型/计数/值），记录宽高、位深、压缩类型、条带偏移和字节数，输出 .tif 文件。'
  },
  vectorize: {
    id:'vectorize', label:'矢量化描摹', sub:'Potrace·贝塞尔曲线拟合',
    brief:'像素边缘检测（Canny/Sobel），利用 Potrace 等算法把边缘路径拟合为贝塞尔曲线，生成 SVG <path> 元素。颜色区域越复杂，描摹质量越差（照片转 SVG 效果有限）。'
  },
  packSVG: {
    id:'packSVG', label:'封装为 SVG 文件', sub:'XML·<svg>·<path>',
    brief:'写入 XML 声明，构建 <svg> 根元素（含 viewBox/width/height），将矢量路径写为 <path> 元素（含 fill/stroke 属性），输出 UTF-8 编码的 .svg 文件。'
  },
  assembleBMP: {
    id:'assembleBMP', label:'组装 BMP 文件', sub:'文件头·信息头·BGR行倒置',
    brief:'将 RGB 像素转为 BGR 顺序，逐行从底到顶写入（行倒置），每行补全 4 字节对齐填充，写入 14B 文件头（含文件大小/偏移）和 40B BITMAPINFOHEADER（含宽高/位深），输出 .bmp 文件。'
  },
  alphaHandle: {
    id:'alphaHandle', label:'透明通道处理', sub:'Alpha合成·背景混合·丢弃',
    brief:'不同格式对 Alpha 的支持不同：PNG/WebP无损/AVIF/HEIF 完整保留；GIF 仅支持单色全透明；JPEG/BMP(24位) 不支持 Alpha，需与指定背景色（通常白色）进行预乘 Alpha 合成（Porter-Duff）后去除 Alpha 通道。'
  },

  // ─── 新增：PNM (Netpbm) ───
  parsePNM: {
    id:'parsePNM', label:'解析 PNM/PPM 文件', sub:'魔数识别·ASCII/二进制·无压缩像素',
    brief:'PNM (portable anymap) 是最简单的图片格式。读取魔数(P1-P6)确定类型和编码，跳过注释行(#开头)，读取宽/高/最大值，按 ASCII 或二进制方式读取像素值。P6(PPM binary)是最常见的 RGB 字节流。'
  },
  assemblePNM: {
    id:'assemblePNM', label:'组装 PNM 文件', sub:'P6头·RGB字节流·所见即所得',
    brief:'将 RGB 像素矩阵写入 P6 PPM 格式：魔术字"P6"+宽高+maxval=255，后接原始 RGB 字节流。这是地球上最简洁的彩色图片格式，头只有一行文本。'
  },

  // ─── 新增：TGA (Targa) ───
  parseTGA: {
    id:'parseTGA', label:'解析 TGA 文件', sub:'18B头·RLE解压·BGR→RGB',
    brief:'读取 TGA 18 字节文件头（ID长度/颜色表类型/图像类型/颜色表规格/图像规格），根据图像类型判断是否为 RLE 压缩，解压后 BGR 顺序转为 RGB，行序可能底部向上（与 BMP 类似）。TGA 是游戏开发经典格式，天然支持 Alpha 通道（32位）。'
  },
  assembleTGA: {
    id:'assembleTGA', label:'组装 TGA 文件', sub:'RGB→BGR·RLE可选·Alpha保留',
    brief:'将 RGB 像素写为 TGA 格式：写入 18B 文件头（图像类型=2 无压缩或 10 RLE），像素 BGR 顺序存入，可选 RLE 压缩。若含 Alpha 通道则 32 位存储。TGA 是 OpenGL 纹理的鼻祖格式。'
  },

  // ─── 新增：ICO (Windows Icon) ───
  parseICO: {
    id:'parseICO', label:'解析 ICO 文件', sub:'多尺寸·DIB内嵌·AND掩码',
    brief:'ICO 文件头(6B)含图标数量。每个条目(16B)含宽/高/颜色数/BPP/大小/偏移。条目指向内嵌的 DIB 位图（等效 BMP 信息头+像素数据+AND 掩码）。从多个尺寸中选择最佳（通常最大），解析 DIB 得到 RGBA 像素（AND 掩码提供 1 位透明）。'
  },
  assembleICO: {
    id:'assembleICO', label:'封装 ICO 文件', sub:'多分辨率·DIB·AND掩码',
    brief:'将 RGB(A) 像素封装为 ICO 图标：写入 ICO 头(6B)，生成多种分辨率（16/32/48/256），每个分辨率写为 DIB 位图 + AND 掩码，条目记录偏移。输出 .ico 文件可直接用作程序图标。'
  },
};

// ─────────────────────────────────────────────
// 72种转换的步骤序列定义
// ─────────────────────────────────────────────
const CONV_MAP = {};

function defConv(src, dst, stepIds){
  const key = `${src}2${dst}`;
  CONV_MAP[key] = {
    src, dst,
    steps: stepIds.map(id => ({ ...STEP_FRAGMENTS[id] }))
  };
}

// 工具：inject render functions批量注册
// ─── BMP 作为源 ───
defConv('BMP','JPEG',['parseBMP','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('BMP','PNG', ['parseBMP','pngFilter','deflate','packPNG']);
defConv('BMP','GIF', ['parseBMP','colorQuant','lzwCompress','packGIF']);
defConv('BMP','WebP',['parseBMP','webpEncode','packWebP']);
defConv('BMP','AVIF',['parseBMP','rgbToYcbcr','avifEncode','packAVIF']);
defConv('BMP','HEIF',['parseBMP','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('BMP','TIFF',['parseBMP','tiffEncode','packTIFF']);
defConv('BMP','SVG', ['parseBMP','vectorize','packSVG']);

// ─── JPEG 作为源 ───
defConv('JPEG','BMP', ['parseJPEG','upsampling','ycbcrToRgb','assembleBMP']);
defConv('JPEG','PNG', ['parseJPEG','upsampling','ycbcrToRgb','pngFilter','deflate','packPNG']);
defConv('JPEG','GIF', ['parseJPEG','upsampling','ycbcrToRgb','colorQuant','lzwCompress','packGIF']);
defConv('JPEG','WebP',['parseJPEG','upsampling','ycbcrToRgb','webpEncode','packWebP']);
defConv('JPEG','AVIF',['parseJPEG','upsampling','ycbcrToRgb','avifEncode','packAVIF']);
defConv('JPEG','HEIF',['parseJPEG','upsampling','ycbcrToRgb','hevcEncode','packHEIF']);
defConv('JPEG','TIFF',['parseJPEG','upsampling','ycbcrToRgb','tiffEncode','packTIFF']);
defConv('JPEG','SVG', ['parseJPEG','upsampling','ycbcrToRgb','vectorize','packSVG']);

// ─── PNG 作为源 ───
defConv('PNG','BMP', ['parsePNG','alphaHandle','assembleBMP']);
defConv('PNG','JPEG',['parsePNG','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('PNG','GIF', ['parsePNG','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('PNG','WebP',['parsePNG','alphaHandle','webpEncode','packWebP']);
defConv('PNG','AVIF',['parsePNG','alphaHandle','avifEncode','packAVIF']);
defConv('PNG','HEIF',['parsePNG','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('PNG','TIFF',['parsePNG','alphaHandle','tiffEncode','packTIFF']);
defConv('PNG','SVG', ['parsePNG','vectorize','packSVG']);

// ─── GIF 作为源 ───
defConv('GIF','BMP', ['parseGIF','assembleBMP']);
defConv('GIF','JPEG',['parseGIF','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('GIF','PNG', ['parseGIF','pngFilter','deflate','packPNG']);
defConv('GIF','WebP',['parseGIF','webpEncode','packWebP']);
defConv('GIF','AVIF',['parseGIF','avifEncode','packAVIF']);
defConv('GIF','HEIF',['parseGIF','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('GIF','TIFF',['parseGIF','tiffEncode','packTIFF']);
defConv('GIF','SVG', ['parseGIF','vectorize','packSVG']);

// ─── WebP 作为源 ───
defConv('WebP','BMP', ['parseWebP','alphaHandle','assembleBMP']);
defConv('WebP','JPEG',['parseWebP','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('WebP','PNG', ['parseWebP','alphaHandle','pngFilter','deflate','packPNG']);
defConv('WebP','GIF', ['parseWebP','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('WebP','AVIF',['parseWebP','alphaHandle','avifEncode','packAVIF']);
defConv('WebP','HEIF',['parseWebP','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('WebP','TIFF',['parseWebP','alphaHandle','tiffEncode','packTIFF']);
defConv('WebP','SVG', ['parseWebP','vectorize','packSVG']);

// ─── AVIF 作为源 ───
defConv('AVIF','BMP', ['parseAVIF','alphaHandle','assembleBMP']);
defConv('AVIF','JPEG',['parseAVIF','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('AVIF','PNG', ['parseAVIF','alphaHandle','pngFilter','deflate','packPNG']);
defConv('AVIF','GIF', ['parseAVIF','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('AVIF','WebP',['parseAVIF','alphaHandle','webpEncode','packWebP']);
defConv('AVIF','HEIF',['parseAVIF','ycbcrToRgb','hevcEncode','packHEIF']);
defConv('AVIF','TIFF',['parseAVIF','alphaHandle','tiffEncode','packTIFF']);
defConv('AVIF','SVG', ['parseAVIF','vectorize','packSVG']);

// ─── HEIF 作为源 ───
defConv('HEIF','BMP', ['parseHEIF','alphaHandle','assembleBMP']);
defConv('HEIF','JPEG',['parseHEIF','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('HEIF','PNG', ['parseHEIF','alphaHandle','pngFilter','deflate','packPNG']);
defConv('HEIF','GIF', ['parseHEIF','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('HEIF','WebP',['parseHEIF','alphaHandle','webpEncode','packWebP']);
defConv('HEIF','AVIF',['parseHEIF','ycbcrToRgb','avifEncode','packAVIF']);
defConv('HEIF','TIFF',['parseHEIF','alphaHandle','tiffEncode','packTIFF']);
defConv('HEIF','SVG', ['parseHEIF','vectorize','packSVG']);

// ─── TIFF 作为源 ───
defConv('TIFF','BMP', ['parseTIFF','alphaHandle','assembleBMP']);
defConv('TIFF','JPEG',['parseTIFF','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('TIFF','PNG', ['parseTIFF','alphaHandle','pngFilter','deflate','packPNG']);
defConv('TIFF','GIF', ['parseTIFF','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('TIFF','WebP',['parseTIFF','alphaHandle','webpEncode','packWebP']);
defConv('TIFF','AVIF',['parseTIFF','alphaHandle','avifEncode','packAVIF']);
defConv('TIFF','HEIF',['parseTIFF','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('TIFF','SVG', ['parseTIFF','vectorize','packSVG']);

// ─── SVG 作为源 ───
defConv('SVG','BMP', ['parseSVG','alphaHandle','assembleBMP']);
defConv('SVG','JPEG',['parseSVG','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('SVG','PNG', ['parseSVG','alphaHandle','pngFilter','deflate','packPNG']);
defConv('SVG','GIF', ['parseSVG','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('SVG','WebP',['parseSVG','alphaHandle','webpEncode','packWebP']);
defConv('SVG','AVIF',['parseSVG','alphaHandle','avifEncode','packAVIF']);
defConv('SVG','HEIF',['parseSVG','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('SVG','TIFF',['parseSVG','alphaHandle','tiffEncode','packTIFF']);
defConv('SVG','ICO', ['parseSVG','alphaHandle','assembleICO']);
defConv('SVG','TGA', ['parseSVG','alphaHandle','assembleTGA']);
defConv('SVG','PNM', ['parseSVG','assemblePNM']);

// ─── ICO 作为源（提取最大尺寸位图 → 转码）───
defConv('ICO','BMP', ['parseICO','alphaHandle','assembleBMP']);
defConv('ICO','JPEG',['parseICO','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('ICO','PNG', ['parseICO','alphaHandle','pngFilter','deflate','packPNG']);
defConv('ICO','GIF', ['parseICO','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('ICO','WebP',['parseICO','alphaHandle','webpEncode','packWebP']);
defConv('ICO','AVIF',['parseICO','alphaHandle','avifEncode','packAVIF']);
defConv('ICO','HEIF',['parseICO','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('ICO','TIFF',['parseICO','alphaHandle','tiffEncode','packTIFF']);
defConv('ICO','SVG', ['parseICO','vectorize','packSVG']);
defConv('ICO','TGA', ['parseICO','alphaHandle','assembleTGA']);
defConv('ICO','PNM', ['parseICO','assemblePNM']);

// ─── TGA 作为源 ───
defConv('TGA','BMP', ['parseTGA','alphaHandle','assembleBMP']);
defConv('TGA','JPEG',['parseTGA','alphaHandle','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('TGA','PNG', ['parseTGA','alphaHandle','pngFilter','deflate','packPNG']);
defConv('TGA','GIF', ['parseTGA','alphaHandle','colorQuant','lzwCompress','packGIF']);
defConv('TGA','WebP',['parseTGA','alphaHandle','webpEncode','packWebP']);
defConv('TGA','AVIF',['parseTGA','alphaHandle','avifEncode','packAVIF']);
defConv('TGA','HEIF',['parseTGA','alphaHandle','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('TGA','TIFF',['parseTGA','alphaHandle','tiffEncode','packTIFF']);
defConv('TGA','SVG', ['parseTGA','vectorize','packSVG']);
defConv('TGA','ICO', ['parseTGA','assembleICO']);
defConv('TGA','PNM', ['parseTGA','assemblePNM']);

// ─── PNM 作为源 ───
defConv('PNM','BMP', ['parsePNM','assembleBMP']);
defConv('PNM','JPEG',['parsePNM','rgbToYcbcr','chromaSubsample','dct','quantize','entropy','packJPEG']);
defConv('PNM','PNG', ['parsePNM','pngFilter','deflate','packPNG']);
defConv('PNM','GIF', ['parsePNM','colorQuant','lzwCompress','packGIF']);
defConv('PNM','WebP',['parsePNM','webpEncode','packWebP']);
defConv('PNM','AVIF',['parsePNM','avifEncode','packAVIF']);
defConv('PNM','HEIF',['parsePNM','rgbToYcbcr','hevcEncode','packHEIF']);
defConv('PNM','TIFF',['parsePNM','tiffEncode','packTIFF']);
defConv('PNM','SVG', ['parsePNM','vectorize','packSVG']);
defConv('PNM','ICO', ['parsePNM','assembleICO']);
defConv('PNM','TGA', ['parsePNM','assembleTGA']);

// ─── 现有格式 → ICO ───
defConv('BMP','ICO', ['parseBMP','assembleICO']);
defConv('JPEG','ICO',['parseJPEG','upsampling','ycbcrToRgb','assembleICO']);
defConv('PNG','ICO', ['parsePNG','alphaHandle','assembleICO']);
defConv('GIF','ICO', ['parseGIF','assembleICO']);
defConv('WebP','ICO',['parseWebP','alphaHandle','assembleICO']);
defConv('AVIF','ICO',['parseAVIF','alphaHandle','assembleICO']);
defConv('HEIF','ICO',['parseHEIF','alphaHandle','assembleICO']);
defConv('TIFF','ICO',['parseTIFF','alphaHandle','assembleICO']);

// ─── 现有格式 → TGA ───
defConv('BMP','TGA', ['parseBMP','assembleTGA']);
defConv('JPEG','TGA',['parseJPEG','upsampling','ycbcrToRgb','assembleTGA']);
defConv('PNG','TGA', ['parsePNG','alphaHandle','assembleTGA']);
defConv('GIF','TGA', ['parseGIF','assembleTGA']);
defConv('WebP','TGA',['parseWebP','alphaHandle','assembleTGA']);
defConv('AVIF','TGA',['parseAVIF','alphaHandle','assembleTGA']);
defConv('HEIF','TGA',['parseHEIF','alphaHandle','assembleTGA']);
defConv('TIFF','TGA',['parseTIFF','alphaHandle','assembleTGA']);

// ─── 现有格式 → PNM（超简单 RGB 字节流）───
defConv('BMP','PNM', ['parseBMP','assemblePNM']);
defConv('JPEG','PNM',['parseJPEG','upsampling','ycbcrToRgb','assemblePNM']);
defConv('PNG','PNM', ['parsePNG','assemblePNM']);
defConv('GIF','PNM', ['parseGIF','assemblePNM']);
defConv('WebP','PNM',['parseWebP','assemblePNM']);
defConv('AVIF','PNM',['parseAVIF','assemblePNM']);
defConv('HEIF','PNM',['parseHEIF','assemblePNM']);
defConv('TIFF','PNM',['parseTIFF','assemblePNM']);

function getConv(src, dst){ return CONV_MAP[`${src}2${dst}`] || null; }
