<template>
  <v-app>
    <h1 v-if="mode === 'New'">
      Add New Run
    </h1>
    <h1 v-else-if="mode === 'Duplicate'">
      Duplicate Run
    </h1>
    <h1 v-else>
      Edit Run
    </h1>
    <v-alert
      v-if="err"
      type="error"
    >
      {{ err.message }}
    </v-alert>
    <div>
      <!-- Normal Inputs -->
      <div class="d-flex">
        <text-input
          v-model="runData.game"
          label="Game"
        ></text-input>
        <text-input
          v-model="runData.category"
          label="Category"
          left-border
        ></text-input>
      </div>
      <div class="d-flex">
        <text-input
          v-model="runData.region"
          label="Region"
        ></text-input>
        <text-input
          v-model="runData.release"
          label="Released"
          left-border
        ></text-input>
        <text-input
          v-model="runData.gameTwitch"
          label="Game (Twitch)"
          left-border
        ></text-input>
      </div>
      <div class="d-flex">
        <text-input
          v-model="runData.system"
          label="System"
        ></text-input>
        <text-input
          v-model="runData.estimate"
          label="Estimate"
          left-border
        ></text-input>
        <text-input
          v-model="runData.setupTime"
          label="Setup Time"
          left-border
        ></text-input>
      </div>
      <!-- Custom Data Inputs -->
      <div>
        <text-input
          v-for="data in customData"
          :key="data.key"
          v-model="runData.customData[data.key]"
          :label="data.name"
        ></text-input>
      </div>
    </div>
    <div>
      <!-- Teams -->
      <draggable
        v-model="runData.teams"
        handle=".TeamHandle"
      >
        <transition-group name="list">
          <team
            v-for="team in runData.teams"
            :key="team.id"
            :team-data="team"
          ></team>
        </transition-group>
      </draggable>
    </div>
    <div
      class="d-flex"
      :style="{ 'margin-top': '20px' }"
    >
      <modify-button
        class="mr-auto"
        icon="mdi-account-multiple-plus"
        tooltip="Add New Team"
        @click="addNewTeam"
      ></modify-button>
      <v-checkbox
        v-if="mode === 'EditActive' && twitchAPIData.state === 'on'"
        v-model="updateTwitch"
        class="ma-0 pa-0 align-center justify-center"
        hide-details
        label="Update Twitch information"
      ></v-checkbox>
      <v-btn
        :style="{ 'margin-left': '10px' }"
        @click="attemptSave"
      >
        OK
      </v-btn>
      <v-btn
        :style="{ 'margin-left': '10px' }"
        @click="close(false)"
      >
        Cancel
      </v-btn>
    </div>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import Draggable from 'vuedraggable';
import store from './store';
import { store as repStore } from '../_misc/replicant-store';
import TextInput from './components/TextInput.vue';
import Team from './components/Team.vue';
import ModifyButton from './components/ModifyButton.vue';
import { nodecg } from '../_misc/nodecg';
import { RunData, RunDataActiveRun } from '../../../types';
import { TwitchAPIData } from '../../../schemas';

enum Mode {
  New = 'New',
  EditActive = 'EditActive',
  EditOther = 'EditOther',
  Duplicate = 'Duplicate',
}

export default Vue.extend({
  components: {
    TextInput,
    Team,
    Draggable,
    ModifyButton,
  },
  data() {
    return {
      dialog: undefined as unknown,
      err: undefined as Error | undefined,
    };
  },
  computed: {
    runData: {
      get(): RunDataActiveRun {
        return store.state.runData;
      },
      set(value: RunData): void {
        store.commit('updateRunData', { value });
      },
    },
    mode: {
      get(): string {
        return store.state.mode;
      },
      set(value: Mode): void {
        store.commit('updateMode', { value });
      },
    },
    updateTwitch: {
      get(): boolean {
        return store.state.updateTwitch;
      },
      set(value: boolean): void {
        store.commit('updateTwitch', { value });
      },
    },
    customData(): array {
      return nodecg.bundleConfig.schedule.customData || [];
    },
    twitchAPIData(): TwitchAPIData {
      return repStore.state.twitchAPIData;
    },
  },
  mounted() {
    this.dialog = nodecg.getDialog('run-modification-dialog') as any; // eslint-disable-line @typescript-eslint/no-explicit-any, max-len

    // Attaching this function to the window for easy access from dashboard panels.
    (window as unknown).open = (opts: { mode: Mode; runData?: RunData }): void => this.open(opts);

    // Small hack to make the NodeCG dialog look a little better for us, not perfect yet.
    const elem = this.dialog.getElementsByTagName('paper-dialog-scrollable')[0] as HTMLElement;
    elem.style.marginBottom = '12px';
  },
  methods: {
    open(opts: { mode: Mode; runData?: RunData; prevID?: string }): void {
      // Waits for dialog to actually open before changing storage.
      this.dialog.open();
      document.addEventListener('dialog-opened', () => {
        this.mode = opts.mode;
        this.err = undefined;
        if (opts.runData) {
          store.commit('updateRunData', { value: opts.runData });
          if (opts.mode === 'Duplicate') {
            store.commit('setAsDuplicate');
          }
        } else if (opts.mode === 'New') {
          store.commit('setPreviousRunID', { value: opts.prevID });
          store.commit('resetRunData');
          store.commit('addNewTeam');
        }
      }, { once: true });
      document.addEventListener('dialog-confirmed', this.confirm, { once: true });
      document.addEventListener('dialog-dismissed', this.dismiss, { once: true });
    },
    addNewTeam(): void {
      store.commit('addNewTeam');
    },
    attemptSave(): void {
      this.err = undefined;
      store.dispatch('saveRunData').then((noTwitchGame) => {
        this.close(true);
        if (noTwitchGame) {
          const alertDialog = nodecg.getDialog('alert-dialog') as any; // eslint-disable-line @typescript-eslint/no-explicit-any, max-len
          alertDialog.querySelector('iframe').contentWindow.open({
            name: 'NoTwitchGame',
          });
        }
      }).catch((err) => {
        this.err = err;
      });
    },
    close(confirm: boolean): void {
      this.dialog._updateClosingReasonConfirmed(confirm); // eslint-disable-line no-underscore-dangle, max-len
      this.dialog.close();
    },
    confirm(): void {
      document.removeEventListener('dialog-dismissed', this.dismiss);
    },
    dismiss(): void {
      document.removeEventListener('dialog-confirmed', this.confirm);
    },
  },
});
</script>

<style>
  .list-move {
    transition: transform 0.2s;
  }
  .list-enter, .list-leave-to
  /* .logo-list-complete-leave-active below version 2.1.8 */ {
    opacity: 0;
    transition: transform 0.2s;
    transition: opacity 0.2s;
  }
  .list-leave-active {
    position: absolute;
  }
</style>

<style scoped>
  h1 {
    margin-bottom: 10px;
  }
</style>
