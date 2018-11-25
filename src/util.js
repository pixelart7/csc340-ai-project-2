import * as tf from '@tensorflow/tfjs'

export default {
  install (Vue, options) {
    Vue.prototype.$tf = tf
  }
}
