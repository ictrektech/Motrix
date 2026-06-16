<template>
  <h1 class="logo-mini">
    <a target="_blank" href="https://www.vivibit.com/" rel="noopener noreferrer">
      <img src="@/assets/vivibit-logo.png" alt="Vivibit">
    </a>
  </h1>
</template>

<script>
  export default {
    name: 'mo-logo-mini'
  }
</script>

<style lang="scss">
.logo-mini {
  margin: 0;
  padding: 0;
  width: 100%;
  > a {
    display: block;
    width: 64px;
    height: 24px;
    text-align: center;
    font-size: 0;
    outline: none;
    margin: 0 auto;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
