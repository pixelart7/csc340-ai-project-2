<template lang="pug">
#home
  .wrapper
    video#videoElement(autoplay, playsinline, muted, :width="inputSize * 2", :height="inputSize")
    .overlay(:class="{'is-loading': !status.ready}", :style="'background: rgba(0, 0, 0, ' + ((countdown.cooldown / countdownMax.cooldown) - 0.1) + ')'")
      .top
        .progress
          .tag
            template(v-if="turn === 'predict'") PREPARE!!
            template(v-if="turn === 'cooldown'") COOLING DOWN...
          .bar
            .inner.predict(v-if="turn === 'predict'", :style="'width: ' + countdown.predict / countdownMax.predict * 100 + '%'")
            .inner.cooldown(v-if="turn === 'cooldown'", :style="'width: ' + countdown.cooldown / countdownMax.cooldown * 100 + '%'")
      .middle
        .countdown
          template(v-if="turn === 'predict' && countdown.predict <= 5000")
            span(v-if="countdown.predict <= 5000 && countdown.predict > 4000") 5
            span(v-if="countdown.predict <= 4000 && countdown.predict > 3000") 4
            span(v-if="countdown.predict <= 3000 && countdown.predict > 2000") 3
            span(v-if="countdown.predict <= 2000") {{countdown.predict / 1000}}
        .draw-count
          span(v-if="!status.ready")
            | Initializing...
            br
          span Draw: {{winCount.draw}}
        //- button(@click="predict") predict
        //- p(v-for="elm in output") {{elm}}
      .side.left
        .last-win(:class="{'is-show': lastWon === 'left'}") {{winComposed}}
        .symbol {{symbols.left}}
        .wincount WIN: {{winCount.left}}
      .side.right
        .last-win(:class="{'is-show': lastWon === 'right'}") {{winComposed}}
        .symbol {{symbols.right}}
        .wincount WIN: {{winCount.right}}
</template>

<script>

const modelPath = 'models/2018-11-04/model.json'
const tf = window.tf

const captureEvery = 5000
const cooldownLength = 5000

export default {
  name: 'home',
  data: () => ({
    winComposed: '',
    winEmojis: ['🎉', '🎊', '🥳', '🍻', '👏', '🍾'],
    winWord: ['Hooray!', 'Superb!', 'Amazing!', 'WIN WIN WIN', 'WINNER WINNER CHICKEN DINNER', 'Congratz!'],
    status: {
      ready: false
    },
    turn: 'predict',
    countdownMax: {
      predict: captureEvery,
      cooldown: cooldownLength
    },
    countdown: {
      predict: 0,
      cooldown: 0
    },
    lastWon: '',
    winCount: {
      left: 0,
      right: 0,
      draw: 0
    },
    inputSize: 150,
    output: [],
    model: {},
    symbols: {
      left: '',
      right: ''
    },
    interval: {}
  }),
  created () {

  },
  async mounted () {
    await this.videoSetup()
  },
  methods: {
    setLoop () {
      this.interval = setInterval(() => {
        this.countdown[this.turn] = this.countdown[this.turn] - 100
        if (this.countdown[this.turn] === 2000 && this.turn === 'predict') {
          this.lastWon = ''
        }
        if (this.countdown[this.turn] === 0 && this.turn === 'predict') {
          this.turn = 'cooldown'
          this.countdown[this.turn] = cooldownLength
          this.predict()
        } else if (this.countdown[this.turn] === 0 && this.turn === 'cooldown') {
          this.turn = 'predict'
          this.countdown[this.turn] = captureEvery
        }
      }, 100)
      this.countdown.predict = captureEvery
    },
    async videoSetup () {
      const video = document.querySelector('#videoElement')
      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            video.srcObject = stream
          })
          .catch((error) => {
            console.error(error.stack)
          })
      }
      this.model = await tf.loadModel(modelPath)
      this.model.summary()
      this.setLoop()
      this.status.ready = true
    },
    capture () {
      return tf.tidy(() => {
        const webcamImage = tf.fromPixels(document.querySelector('#videoElement'))
        const croppedImages = this.cropImage(webcamImage)
        const batchedImages = [croppedImages[0].expandDims(0), croppedImages[1].expandDims(0)]

        return [batchedImages[0].toFloat(), batchedImages[1].toFloat()]
      })
    },
    cropImage (img) {
      const img1 = img.slice([0, 0, 0], [150, 150, 3])
      const img2 = img.slice([0, 150, 0], [150, 150, 3])
      return [img1, img2]
    },
    predict () {
      const imgs = this.capture()
      const out1 = this.model.predict(imgs[0])
      const out2 = this.model.predict(imgs[1])
      const data1 = out1.dataSync()
      const data2 = out2.dataSync()
      this.symbols.left = this.emojiParser(data1)
      this.symbols.right = this.emojiParser(data2)
      this.winHandler(data1, data2)
      this.composeWinword()
      // this.output.push(out1.dataSync());
      // this.output.push(out2.dataSync());
    },
    composeWinword () {
      this.winComposed = `${this.winEmojis[Math.floor(Math.random() * this.winEmojis.length)]} ${this.winWord[Math.floor(Math.random() * this.winWord.length)]}`
    },
    winHandler (leftData, rightData) {
      let left = 0
      let right = 0

      const arr = Object.values(leftData)
      const maxiLeft = arr.indexOf(Math.max(...leftData))
      const arr2 = Object.values(rightData)
      const maxiRight = arr2.indexOf(Math.max(...rightData))
      if (maxiLeft === 0 && maxiRight === 1) {
        right += 1
      } else if (maxiLeft === 0 && maxiRight === 2) {
        left += 1
      } else if (maxiLeft === 1 && maxiRight === 0) {
        left += 1
      } else if (maxiLeft === 1 && maxiRight === 2) {
        right += 1
      } else if (maxiLeft === 2 && maxiRight === 0) {
        right += 1
      } else if (maxiLeft === 2 && maxiRight === 1) {
        left += 1
      }

      this.winCount.left = this.winCount.left + left
      this.winCount.right = this.winCount.right + right
      if (left > right) {
        this.lastWon = 'left'
      } else if (right > left) {
        this.lastWon = 'right'
      } else {
        this.lastWon = 'draw'
        this.winCount.draw += 1
      }
    },
    emojiParser (data) {
      const arr = Object.values(data)
      const maxi = arr.indexOf(Math.max(...arr))
      if (maxi === 0) return '✊'
      if (maxi === 1) return '✋'
      if (maxi === 2) return '✌️'
    }
  },
  components: {}
}
</script>

<style lang="scss">
.overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  display: flex;
  background: rgba(#fff, 0.01);
  transition: all 0.8s;
  &.is-loading {
    background: rgba(#fff, 0.8);
  }
}

.side {
  width: 50%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  box-sizing: border-box;
  &.left {
    border-right: 2px solid rgba(#fff, 0.1);
    border-bottom: 4px solid rgba(red, 0.5);
  }
  &.right {
    border-left: 2px solid rgba(#fff, 0.1);
    border-bottom: 4px solid rgba(blue, 0.5);
  }
  .last-win {
    height: 36px;
    opacity: 0;
    color: rgba(#fff, 0.9);
    text-shadow: 0px 1px 3px rgba(#000, 0.6);
    font-weight: 600;
    transition: all 0.15s;
    &.is-show {
      opacity: 1;
    }
  }
  .symbol {
    font-size: 64px;
  }
  .wincount {
    font-size: 22px;
    font-weight: 600;
    color: rgba(#fff, 0.9);
    text-shadow: 0px 1px 3px rgba(#000, 0.6);
  }
}

.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  .progress {
    height: 28px;
    display: flex;
    align-items: center;
    .tag {
      line-height: 28px;
      box-sizing: border-box;
      width: 156px;
      padding: 0 8px;
      background: rgba(#fff, 0.9);
      font-weight: 600;
    }
    .bar {
      height: 28px;
      flex: 1;
      background: rgba(#fff, 0.1);
      .inner {
        background: rgba(#000, 0.6);
        transition: all 0.1s;
        height: 28px;
        &.predict {
          background: rgba(orange, 0.6)
        }
        &.cooldown {
          background: rgba(green, 0.6)
        }
      }
    }
  }
}

.middle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  // background: rgba(#fff, 0.4)
  .countdown {
    text-align: center;
    span {
      color: #fff;
      font-size: 36px;
      font-weight: 700;
    }
  }
  .draw-count {
    text-align: center;
    color: rgba(#fff, 0.8);
    text-shadow: 0px 1px 3px rgba(#000, 0.6);
  }
}

.wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
}

#videoElement {
  object-fit: fill;
  width: auto;
  max-width: 100%;
  height: 100%;
}
</style>
