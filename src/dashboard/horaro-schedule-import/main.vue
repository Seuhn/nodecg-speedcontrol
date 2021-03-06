<template>
  <v-app>
    <!-- URL Field -->
    <v-text-field
      v-model="url"
      filled
      hide-details
      label="Horaro Schedule URL"
      :disabled="importStatus.importing"
    ></v-text-field>
    <!-- "Load Schedule Data" Button -->
    <v-btn
      :style="{ margin: '5px 0 10px 0' }"
      :disabled="importStatus.importing"
      @click="loadSchedule"
    >
      Load Schedule Data
    </v-btn>
    <!-- Message before schedule data is loaded -->
    <div v-if="!loaded && !importStatus.importing">
      Insert the Horaro schedule URL above and press
      the "Load Schedule Data" button to continue.
    </div>
    <!-- Dropdowns after data is imported to toggle settings -->
    <div v-if="loaded && !importStatus.importing">
      Select the correct columns that match the data type below,
      if the one auto-selected is wrong:
      <dropdown
        v-for="option in runDataOptions"
        :key="option.key"
        :option="option"
        :columns="columns"
        class="Dropdown"
      ></dropdown>
      <div :style="{ 'margin-top': '10px' }">
        Split Players:
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-icon
              small
              :style="{ 'padding-bottom': '2px' }"
              v-on="on"
            >
              mdi-help-circle-outline
            </v-icon>
          </template>
          <span>This option dictates how the players in your relevant schedule column are split;
            check the README for more information.</span>
        </v-tooltip>
      </div>
      <v-select
        v-model="splitOption"
        :items="splitOptionsOpts"
        label="Player Split"
        filled
        single-line
        hide-details
        dense
        :height="27"
        class="Dropdown"
      >
      </v-select>
    </div>
    <!-- Message while importing is in progress -->
    <div v-else-if="importStatus.importing">
      Import currently in progress...
    </div>
    <div :style="{ 'margin-top': '10px' }">
      <!-- Import Button, if importing -->
      <v-btn
        v-if="importStatus.importing"
        :disabled="true"
        block
      >
        Importing {{ importStatus.item }}/{{ importStatus.total }}
      </v-btn>
      <!-- Import Button, if not importing and no data loaded -->
      <v-btn
        v-else-if="!importStatus.importing && !loaded"
        block
        :disabled="!loaded"
        @click="importConfirm"
      >
        Import
      </v-btn>
      <!-- Import Button, if not importing but data loaded -->
      <div
        v-else
        class="d-flex justify-center"
      >
        <v-btn
          :style="{ flex: 1 }"
          @click="importConfirm"
        >
          Import
        </v-btn>
        <config-button
          icon="mdi-content-save-outline"
          tooltip="Save Configuration"
          :disabled="saved"
          @click="saveOpts"
        ></config-button>
        <config-button
          icon="mdi-undo"
          tooltip="Clear Custom Configuration"
          :disabled="restored"
          @click="clearOpts"
        ></config-button>
      </div>
    </div>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import uuid from 'uuid/v4';
import { nodecg } from '../_misc/nodecg';
import { store as repStore } from '../_misc/replicant-store';
import store from './store';
import RunDataOptions from './RunDataOptions';
import Dropdown from './components/Dropdown.vue';
import ConfigButton from './components/ConfigButton.vue';
import { HoraroImportStatus } from '../../../schemas';

export default Vue.extend({
  components: {
    Dropdown,
    ConfigButton,
  },
  data() {
    return {
      dashID: uuid(), // Temp ID for this page load.
      url: nodecg.bundleConfig.schedule.defaultURL,
      loaded: false,
      saved: false,
      restored: false,
      columns: [] as string[],
      runDataOptions: RunDataOptions,
      splitOptionsOpts: [
        {
          value: 0,
          text: 'vs/vs. [Teams]',
        },
        {
          value: 1,
          text: 'Comma (,) [No Teams]',
        },
      ],
    };
  },
  computed: {
    importStatus(): HoraroImportStatus {
      return repStore.state.horaroImportStatus;
    },
    splitOption: {
      get(): number {
        return store.state.opts.split;
      },
      set(value: number): void {
        store.commit('updateSplit', { value });
      },
    },
    customData(): { name: string; key: string }[] {
      return nodecg.bundleConfig.schedule.customData || [];
    },
  },
  created() {
    this.addCustomDataDropdowns(); // Add dropdowns for custom data on page load.
  },
  methods: {
    loadSchedule(): void {
      nodecg.sendMessage('loadSchedule', {
        url: this.url,
        dashID: this.dashID,
      }).then((data) => {
        this.loaded = true;
        this.columns = data.schedule.columns;
        if (repStore.state.horaroImportSavedOpts) {
          store.commit('loadOpts');
        } else {
          this.predictColumns();
        }
      }).catch(() => {
        this.loaded = false;
      });
    },
    addCustomDataDropdowns(): void {
      this.runDataOptions = this.runDataOptions.concat(
        this.customData.map((col) => {
          store.commit('addCustomColumn', { name: col.key });
          return {
            name: col.name,
            key: col.key,
            custom: true,
            predict: [
              col.name.toLowerCase(),
            ],
          };
        }),
      );
    },
    predictColumns(): void {
      this.runDataOptions.forEach((option) => {
        if (!option.predict.length) {
          return; // Ignore if no way to predict.
        }
        const index = this.columns.findIndex(
          (col) => option.predict.some((pred) => !!col.toLowerCase().includes(pred)),
        );
        store.commit('updateColumn', {
          name: option.key,
          value: (index >= 0) ? index : null,
          custom: option.custom,
        });
      });
    },
    importConfirm(): void {
      const alertDialog = nodecg.getDialog('alert-dialog') as any; // eslint-disable-line @typescript-eslint/no-explicit-any, max-len
      alertDialog.querySelector('iframe').contentWindow.open({
        name: 'HoraroImportConfirm',
        func: this.import,
      });
    },
    import(confirm: boolean): void {
      if (confirm) {
        nodecg.sendMessage('importSchedule', {
          opts: store.state.opts,
          dashID: this.dashID,
        }).then(() => {
          this.loaded = false;
        }).catch(() => {
          this.loaded = false;
        });
      }
    },
    saveOpts(): void {
      store.commit('saveOpts');
      this.saved = true;
      setTimeout(() => { this.saved = false; }, 1000);
    },
    clearOpts(): void {
      store.commit('clearOpts');
      this.customData.forEach((col) => {
        store.commit('addCustomColumn', { name: col.key });
      });
      this.predictColumns();
      this.restored = true;
      setTimeout(() => { this.restored = false; }, 1000);
    },
  },
});
</script>

<style>
  /* Tweaks to dropdowns to make them smaller. */
  .Dropdown .v-input__slot {
    min-height: 0 !important;
  }
  .Dropdown .v-label {
    top: 4px !important;
  }
  .Dropdown .v-input__append-inner {
    margin-top: 2px !important;
  }
</style>
