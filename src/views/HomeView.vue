<script setup>
// @ is an alias to /src
import HelloWorld from '@/components/HelloWorld.vue'
import '@/vue3/HelloVue3.ce.vue.register'

import { version } from 'vue'
const msg = `Hello Vue ${version}`
</script>

<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <HelloWorld :msg="msg" />

    <hello-vue3-ce />
  </div>
</template>
