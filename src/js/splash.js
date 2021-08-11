class Pixel {
  constructor(index, colorSet) {
    this.colorSet = colorSet
    this.random = this.rng(index * 9973)

    this.color = this.pickColor()
    this.nextColor = this.pickColor()
    this.start = 0
    this.target = this.makeTarget()
    this.interpolate = false
  }

  rng(seed) {
    const FRAC = 2.3283064365386963e-10 /* 2^-32 */
    const C1 = 69069
    const C2 = 2091639
    let s0 = 0,
      s1 = 0,
      s2 = 0,
      c = 0,
      t
    seed = seed < 1 ? 1 / seed : seed
    s0 = (seed >>> 0) * FRAC
    seed = (seed * C1 + 1) >>> 0
    s1 = seed * FRAC
    seed = (seed * C1 + 1) >>> 0
    s2 = seed * FRAC
    c = 1
    return () => {
      t = C2 * s0 + c * FRAC
      s0 = s1
      s1 = s2
      c = t | 0
      s2 = t - c
      return s2
    }
  }

  lerp(a, b, f) {
    return a + f * (b - a)
  }

  setColorSet(colorSet) {
    this.colorSet = colorSet
  }

  getColor(time) {
    if (!time) {
      time = this.start
    }
    let delta = (time - this.start) / 1000
    if (delta > this.target) {
      delta = 0
      this.color = this.nextColor
      this.nextColor = this.pickColor()
      this.start = time
      this.target = this.makeTarget()
      this.interpolate = this.random() >= 0.5
    }
    if (this.interpolate) {
      const f = Math.max(0, Math.min(1, delta / this.target))
      const red = Math.floor(this.lerp(this.color[0], this.nextColor[0], f))
      const green = Math.floor(this.lerp(this.color[1], this.nextColor[1], f))
      const blue = Math.floor(this.lerp(this.color[2], this.nextColor[2], f))
      return [red, green, blue]
    } else {
      return this.color
    }
  }

  makeTarget() {
    // 1 - 15 frames at 60 fps
    return 0.02 + this.random() * 0.23
  }

  pickColor() {
    const {
      colorSet: { colors, allowedNextColors },
    } = this
    const idx = Math.floor(this.random() * colors.length)
    let [red, green, blue] = colors[idx]
    if (this.random() < 0.6) {
      const nextColors = allowedNextColors[colors[idx]]
      const secondIdx = Math.floor(this.random() * nextColors.length)
      const f = this.random()
      red = Math.floor(this.lerp(colors[idx][0], nextColors[secondIdx][0], f))
      green = Math.floor(this.lerp(colors[idx][1], nextColors[secondIdx][1], f))
      blue = Math.floor(this.lerp(colors[idx][2], nextColors[secondIdx][2], f))
    }
    return [red, green, blue]
  }
}

class Splash {
  constructor(id, columns = 32, colorSet = false) {
    this.visible = true
    this.columns = columns

    this.canvas = document.getElementById(id)
    this.context = this.canvas.getContext('2d')
    this.configureContext(this.context)
    this.pixels = []
    this.colorSet = colorSet || splashColorSets.brand

    this.draw(0)
  }

  configureContext(ctx) {
    ctx.mozImageSmoothingEnabled = false
    ctx.webkitImageSmoothingEnabled = false
    ctx.msImageSmoothingEnabled = false
    ctx.imageSmoothingEnabled = false
  }

  setColorSet(colors) {
    this.colorSet = colors
    for (let i = 0; i < this.pixels.length; i++) {
      this.pixels[i].setColorSet(colors)
    }
  }

  stop() {
    this.setVisible(false)
  }

  setVisible(visible) {
    const restart = !this.visible && visible
    this.visible = visible
    if (restart) {
      this.draw()
    }
  }

  resize(width, height) {
    this.canvas.width = width
    this.canvas.height = height
    this.aspectRatio = width / height
    this.rows = Math.max(1, Math.floor(this.columns / this.aspectRatio))

    this.pixelCanvas = document.createElement('canvas')
    this.pixelCanvas.width = this.columns
    this.pixelCanvas.height = this.rows
    this.pixelCtx = this.pixelCanvas.getContext('2d')

    this.pixelImageData = this.pixelCtx.createImageData(this.columns, this.rows)
    this.pixelDataArray = this.pixelImageData.data

    for (let ii = 0; ii < this.pixelDataArray.length; ii++) {
      this.pixelDataArray[ii] = 255;
    }
    this.pixels = Array(this.columns * this.rows);
    for (let ii = 0; ii < this.pixels.length; ii++) {
      this.pixels[ii] = new Pixel(ii, this.colorSet);
    }
    this.configureContext(this.context)

    if (this.visible) {
      this.drawFrame()
    }
  }

  restart() {
    if (this.visible) {
      this.draw()
    }
  }

  draw = time => {
    if (!this.visible) return
    this.drawFrame(time)
    requestAnimationFrame(this.draw)
  }

  drawFrame(time) {
    if (!this.pixelCtx) return
    const { context, pixelDataArray, pixelImageData, pixelCanvas, canvas, pixelCtx, pixels } = this
    for (let i = 0; i < this.pixels.length; i++) {
      const color = pixels[i].getColor(time)
      pixelDataArray.set(color, i * 4)
    }
    pixelCtx.putImageData(pixelImageData, 0, 0)
    context.drawImage(pixelCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height, 0, 0, canvas.width, canvas.height)
  }
}

const orange = [255, 180, 0]
const pink = [255, 0, 180]
const green = [180, 255, 0]
const purple = [180, 0, 255]
const blue = [0, 180, 255]

const darkGrey = [85, 85, 85]
const grey = [128, 128, 128]
const lightGrey = [170, 170, 170]

const splashColorSets = {
  brand: {
    colors: [orange, pink, green, purple, blue],
    allowedNextColors: {
      [orange]: [pink, green, purple, blue],
      [pink]: [orange, purple, blue],
      [green]: [orange, blue],
      [purple]: [orange, pink, blue],
      [blue]: [orange, pink, green, purple],
    },
  },
}