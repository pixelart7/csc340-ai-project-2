<template lang="pug">
#landing
  .links
    h4 Model Chooser
    router-link(to="/game/2018-11-04") A
    router-link(to="/game/2018-11-26") B
  .about

</template>

<script>
export default {
}
</script>

<style lang="scss">
#landing {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  .links {
    text-align: center;
    color: #fff;
    h4 {
      font-size: 24px;
    }
    a {
      display: inline-block;
      padding: 8px 16px;
      margin: 0 4px;
      color: #fff;
      font-size: 18px;
      line-height: 28px;
      width: 96px;
      border: 1px solid rgba(#fff, 0.8);
      text-decoration: none;
      transition: all 0.15s;
      &:hover {
        background: rgba(#fff, 0.3);
      }
    }
  }
}
</style>
