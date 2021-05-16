const ADMINDATA = (() => {
  const module = {};

  // Used for handling the file explorer selection
  module.sharedSelect = { value: '' };

  // Used for modifying a user
  module.selectedUser = { value: '' };

  // For lastFM user data on new user form
  module.lastFMStorage = { username: '', password: '' };

  // folders
  module.folders = {};
  module.foldersUpdated = { ts: 0 };
  // users
  module.users = {};
  module.usersUpdated = { ts: 0 };
  // db stuff
  module.dbParams = {};
  module.dbParamsUpdated = { ts: 0 };
  // server settings
  module.serverParams = {};
  module.serverParamsUpdated = { ts: 0 };
  // transcoding
  module.transcodeParams = {};
  module.transcodeParamsUpdated = { ts: 0 };
  module.downloadPending = { val: false };
  // shared playlists
  module.sharedPlaylists = [];
  module.sharedPlaylistUpdated = { ts: 0 };
  // federation
  module.federationEnabled = { val: false };
  module.federationParams = {};
  module.federationParamsUpdated = { ts: 0 };

  module.getSharedPlaylists = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/db/shared`
    });
    console.log(res.data)

    while(module.sharedPlaylists.length !== 0) {
      module.sharedPlaylists.pop();
    }

    res.data.forEach(item => {
      module.sharedPlaylists.push(item);
    });

    module.sharedPlaylistUpdated.ts = Date.now();
  };

  module.deleteSharedPlaylist = async (playlistObj) => {
    const res = await API.axios({
      method: 'DELETE',
      url: `${API.url()}/api/v1/admin/db/shared`,
      data: { id: playlistObj.playlistId }
    });

    module.sharedPlaylists.splice(module.sharedPlaylists.indexOf(playlistObj), 1);
  };

  module.deleteUnxpShared = async () => {
    const res = await API.axios({
      method: 'DELETE',
      url: `${API.url()}/api/v1/admin/db/shared/eternal`
    });

    // Clear playlist array since we no longer know it's state after this api call
    while(module.sharedPlaylists.length !== 0) {
      module.sharedPlaylists.pop();
    }
  };

  module.deleteExpiredShared = async () => {
    const res = await API.axios({
      method: 'DELETE',
      url: `${API.url()}/api/v1/admin/db/shared/expired`
    });

    // Clear playlist array since we no longer know it's state after this api call
    while(module.sharedPlaylists.length !== 0) {
      module.sharedPlaylists.pop();
    }
  };

  module.getFolders = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/directories`
    });

    Object.keys(res.data).forEach(key=>{
      module.folders[key] = res.data[key];
    });

    module.foldersUpdated.ts = Date.now();
  };

  module.getUsers = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/users`
    });

    Object.keys(res.data).forEach(key=>{
      module.users[key] = res.data[key];
    });

    module.usersUpdated.ts = Date.now();
  };

  module.getDbParams = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/db/params`
    });

    Object.keys(res.data).forEach(key=>{
      module.dbParams[key] = res.data[key];
    });

    module.dbParamsUpdated.ts = Date.now();
  }

  module.getServerParams = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/config`
    });

    Object.keys(res.data).forEach(key=>{
      module.serverParams[key] = res.data[key];
    });

    module.serverParamsUpdated.ts = Date.now();
  }

  module.getTranscodeParams = async () => {
    const res = await API.axios({
      method: 'GET',
      url: `${API.url()}/api/v1/admin/transcode`
    });

    Object.keys(res.data).forEach(key=>{
      module.transcodeParams[key] = res.data[key];
    });

    module.transcodeParamsUpdated.ts = Date.now();
  }

  module.getFederationParams = async () => {
    try {
      const res = await API.axios({
        method: 'GET',
        url: `${API.url()}/api/v1/federation/stats`
      });
  
      module.federationEnabled.val = true;

      Object.keys(res.data).forEach(key=>{
        module.federationParams[key] = res.data[key];
      });
    }catch (err) {}

    module.federationParamsUpdated.ts = Date.now();
  }

  return module;
})();

// Load in data
ADMINDATA.getTranscodeParams();
ADMINDATA.getFolders();
ADMINDATA.getUsers();
ADMINDATA.getDbParams();
ADMINDATA.getServerParams();
ADMINDATA.getFederationParams();

// initialize modal
M.Modal.init(document.querySelectorAll('.modal'), {
  onCloseEnd: () => {
    // reset modal on every close
    modVM.currentViewModal = 'null-modal';
  }
});

// Intialize Clipboard
new ClipboardJS('.fed-copy-button');

const foldersView = Vue.component('folders-view', {
  data() {
    return {
      componentKey: false, // Flip this value to force re-render
      dirName: '',
      folder: ADMINDATA.sharedSelect,
      foldersTS: ADMINDATA.foldersUpdated,
      folders: ADMINDATA.folders,
      submitPending: false
    };
  },
  template: `
    <div>
      <div class="container">
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Add Folder</span>
                <form id="choose-directory-form" @submit.prevent="submitForm">
                  <div class="row">
                    <div class="input-field col s12">
                      <input v-on:click="addFolderDialog()" @blur="maybeResetForm()" v-model="folder.value" id="folder-name" required type="text" class="validate">
                      <label for="folder-name">Select Directory</label>
                      <span class="helper-text">Click to choose directory</span>
                    </div>
                  </div>
                  <div class="row">
                    <div class="input-field col s12">
                      <input @blur="maybeResetForm()" pattern="[a-zA-Z0-9-]+" v-model="dirName" id="add-directory-name" required type="text" class="validate">
                      <label for="add-directory-name">Server Path Alias (vPath)</label>
                      <span class="helper-text">No special characters or spaces</span>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col m6 s12">
                      <div class="pad-checkbox"><label>
                        <input id="folder-auto-access" type="checkbox" checked/>
                        <span>Give Access To All Users</span>
                      </label></div>
                    </div>
                    <button class="btn green waves-effect waves-light col m6 s12" type="submit" :disabled="submitPending === true">
                      {{submitPending === false ? 'Add Folder' : 'Adding...'}}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-show="foldersTS.ts === 0" class="row">
        <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
      </div>
      <div v-show="foldersTS.ts > 0" class="row">
        <div class="col s12">
          <h5>Directories</h5>
          <table>
            <thead>
              <tr>
                <th>Server Path Alias (vPath)</th>
                <th>Directory</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, k) in folders">
                <td>{{k}}</td>
                <td>{{v.root}}</td>
                <td>[<a v-on:click="removeFolder(k, v.root)">remove</a>]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`,
    created: function() {
      ADMINDATA.sharedSelect.value = '';
    },
    watch: {
      'folder.value': function (newVal, oldVal) {
        this.makeVPath(newVal);
      }
    },
    methods: {
      makeVPath(dir) {
        const newName = dir.split(/[\\\/]/).pop().toLowerCase().replace(' ', '-').replace(/[^a-zA-Z0-9-]/g, "");
        
        // TODO: Check that vpath doesn't already exist

        this.dirName = newName;
        this.$nextTick(() => {
          M.updateTextFields();
        });
      },
      maybeResetForm: function() {
        if (this.dirName === '' && this.folder.value === '') {
          document.getElementById("choose-directory-form").reset();
        }
      },
      addFolderDialog: function (event) {
        modVM.currentViewModal = 'file-explorer-modal';
        M.Modal.getInstance(document.getElementById('admin-modal')).open();
      },
      submitForm: async function () {
        if (ADMINDATA.folders[this.dirName]) {
          iziToast.warn({
            title: 'Server Path already in use',
            position: 'topCenter',
            timeout: 3500
          });
          return;
        }

        try {
          this.submitPending = true;

          await API.axios({
            method: 'PUT',
            url: `${API.url()}/api/v1/admin/directory`,
            data: {
              directory: this.folder.value,
              vpath: this.dirName,
              autoAccess: document.getElementById('folder-auto-access').checked
            }
          });

          if (document.getElementById('folder-auto-access').checked) {
            Object.values(ADMINDATA.users).forEach(user => {
              user.vpaths.push(this.dirName);
            });
          }

          Vue.set(ADMINDATA.folders, this.dirName, { root: this.folder.value });
          this.dirName = '';
          this.folder.value = '';
          this.$nextTick(() => {
            M.updateTextFields();
          });
        }catch(err) {
          iziToast.error({
            title: 'Failed to add directory',
            position: 'topCenter',
            timeout: 3500
          });
        } finally {
          this.submitPending = false;
        }
      },
      removeFolder: async function(vpath, folder) {
        iziToast.question({
          timeout: 20000,
          close: false,
          overlayClose: true,
          overlay: true,
          displayMode: 'once',
          id: 'question',
          zindex: 99999,
          layout: 2,
          maxWidth: 600,
          title: `Remove access to <b>${folder}</b>?`,
          message: `No files will be deleted. Your server will need to reboot.`,
          position: 'center',
          buttons: [
            ['<button><b>Remove</b></button>', (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              API.axios({
                method: 'DELETE',
                url: `${API.url()}/api/v1/admin/directory`,
                data: { vpath: vpath }
              }).then(() => {
                iziToast.warning({
                  title: 'Server Rebooting. Please wait 30s for the server to come back online',
                  position: 'topCenter',
                  timeout: 3500
                });
                Vue.delete(ADMINDATA.folders, vpath);
                Object.values(ADMINDATA.users).forEach(user => {
                  if (user.vpaths.includes(vpath)) {
                    user.vpaths.splice(user.vpaths.indexOf(vpath), 1);
                  }
                });
              }).catch(() => {
                iziToast.error({
                  title: 'Failed to remove folder',
                  position: 'topCenter',
                  timeout: 3500
                });
              });
            }, true],
            ['<button>Go Back</button>', (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            }],
          ]
        });
      }
    }
});

const usersView = Vue.component('users-view', {
  data() {
    return {
      directories: ADMINDATA.folders,
      users: ADMINDATA.users,
      usersTS: ADMINDATA.usersUpdated,
      newUsername: '',
      newPassword: '',
      makeAdmin: Object.keys(ADMINDATA.users).length === 0 ? true : false,
      submitPending: false,
      selectInstance: null
    };
  },
  template: `
    <div>
      <div class="container">
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
              <span class="card-title">Add User</span>
                <form id="add-user-form" @submit.prevent="addUser">
                  <div class="row">
                    <div class="input-field directory-name-field col s12 m6">
                      <input @blur="maybeResetForm()" pattern="[a-zA-Z0-9-]+" v-model="newUsername" id="new-username" required type="text" class="validate">
                      <label for="new-username">Username</label>
                    </div>
                    <div class="input-field directory-name-field col s12 m6">
                      <input @blur="maybeResetForm()" v-model="newPassword" id="new-password" required type="password" class="validate">
                      <label for="new-password">Password</label>
                    </div>
                  </div>
                  <div class="row">
                    <div class="input-field col s12">
                      <select class="material-select" :disabled="Object.keys(directories).length === 0" id="new-user-dirs" multiple>
                        <option disabled selected value="" v-if="Object.keys(directories).length === 0">You must add a directory before adding a user</option>
                        <option selected v-for="(key, value) in directories" :value="value">{{ value }}</option>
                      </select>
                      <label for="new-user-dirs">Select User's Directories</label>
                    </div>
                  </div>
                  <div class="row">
                    <div class="input-field col s12 m6">
                      <div class="pad-checkbox"><label>
                        <input id="folder-autoaccess" type="checkbox" v-model="makeAdmin"/>
                        <span>Make Admin</span>
                      </label></div>
                    </div>
                    <div class="col s12 m6">
                      <a v-on:click="openLastFmModal()" href="#!">Add last.fm account</a>
                    </div>
                  </div>
                  <div class="row">
                    <button id="submit-add-user-form" class="btn green waves-effect waves-light col m6 s12" type="submit" :disabled="submitPending === true">
                      {{submitPending === false ? 'Add User' : 'Adding...'}}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-show="usersTS.ts === 0" class="row">
        <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
      </div>
      <div v-show="usersTS.ts > 0" class="row">
        <div class="col s12">
          <h5>Users</h5>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Directories</th>
                <th>Admin</th>
                <th>Modify</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, k) in users">
                <td>{{k}}</td>
                <td>{{v.vpaths.join(', ')}}</td>
                <td>
                  <svg v-if="v.admin === true" height="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 117.72 117.72"><path d="M58.86 0c9.13 0 17.77 2.08 25.49 5.79-3.16 2.5-6.09 4.9-8.82 7.21a48.673 48.673 0 00-16.66-2.92c-13.47 0-25.67 5.46-34.49 14.29-8.83 8.83-14.29 21.02-14.29 34.49 0 13.47 5.46 25.66 14.29 34.49 8.83 8.83 21.02 14.29 34.49 14.29s25.67-5.46 34.49-14.29c8.83-8.83 14.29-21.02 14.29-34.49 0-3.2-.31-6.34-.9-9.37 2.53-3.3 5.12-6.59 7.77-9.85a58.762 58.762 0 013.21 19.22c0 16.25-6.59 30.97-17.24 41.62-10.65 10.65-25.37 17.24-41.62 17.24-16.25 0-30.97-6.59-41.62-17.24C6.59 89.83 0 75.11 0 58.86c0-16.25 6.59-30.97 17.24-41.62S42.61 0 58.86 0zM31.44 49.19L45.8 49l1.07.28c2.9 1.67 5.63 3.58 8.18 5.74a56.18 56.18 0 015.27 5.1c5.15-8.29 10.64-15.9 16.44-22.9a196.16 196.16 0 0120.17-20.98l1.4-.54H114l-3.16 3.51C101.13 30 92.32 41.15 84.36 52.65a325.966 325.966 0 00-21.41 35.62l-1.97 3.8-1.81-3.87c-3.34-7.17-7.34-13.75-12.11-19.63-4.77-5.88-10.32-11.1-16.79-15.54l1.17-3.84z" fill="#01a601"/></svg>
                </td>
                <td>
                  [<a v-on:click="changePassword(k)">change pass</a>]
                  [<a v-on:click="changeVPaths(k)">change folders</a>]
                  [<a v-on:click="changeAccess(k)">access</a>]
                  [<a v-on:click="deleteUser(k)">del</a>]
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`,
    mounted: function () {
      this.selectInstance = M.FormSelect.init(document.querySelectorAll(".material-select"));
    },
    beforeDestroy: function() {
      this.selectInstance[0].destroy();
    },
    methods: {
      openLastFmModal: function() {
        modVM.currentViewModal = 'lastfm-modal';
        M.Modal.getInstance(document.getElementById('admin-modal')).open();
      },
      maybeResetForm: function() {

      },
      changeVPaths: function(username) {
        ADMINDATA.selectedUser.value = username;
        modVM.currentViewModal = 'user-vpaths-modal';
        M.Modal.getInstance(document.getElementById('admin-modal')).open();
      },
      changeAccess: function(username) {
        ADMINDATA.selectedUser.value = username;
        modVM.currentViewModal = 'user-access-modal';
        M.Modal.getInstance(document.getElementById('admin-modal')).open();
      },
      changePassword: function(username) {
        ADMINDATA.selectedUser.value = username;
        modVM.currentViewModal = 'user-password-modal';
        M.Modal.getInstance(document.getElementById('admin-modal')).open();
      },
      deleteUser: function (username) {
        iziToast.question({
          timeout: 20000,
          close: false,
          overlayClose: true,
          overlay: true,
          displayMode: 'once',
          id: 'question',
          zindex: 99999,
          title: `Delete <b>${username}</b>?`,
          position: 'center',
          buttons: [
            ['<button><b>Delete</b></button>', async (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              try {
                await API.axios({
                  method: 'DELETE',
                  url: `${API.url()}/api/v1/admin/users`,
                  data: { username: username }
                });
                Vue.delete(ADMINDATA.users, username);
              } catch (err) {
                iziToast.error({
                  title: 'Failed to delete user',
                  position: 'topCenter',
                  timeout: 3500
                });
              }
            }, true],
            ['<button>Go Back</button>', (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            }],
          ]
        });
      },
      addUser: async function (event) {
        try {
          this.submitPending = true;

          const selected = document.querySelectorAll('#new-user-dirs option:checked');

          const data = {
            username: this.newUsername,
            password: this.newPassword,
            vpaths: Array.from(selected).map(el => el.value),
            admin: this.makeAdmin
          };

          await API.axios({
            method: 'PUT',
            url: `${API.url()}/api/v1/admin/users`,
            data: data
          });

          Vue.set(ADMINDATA.users, this.newUsername, { vpaths: data.vpaths, admin: data.admin });
          this.newUsername = '';
          this.newPassword = '';

          // if this is the first user, prompt user and take them to login page
          if (Object.keys(ADMINDATA.users).length === 1) {
            iziToast.question({
              timeout: false,
              close: false,
              overlay: true,
              displayMode: 'once',
              id: 'question',
              zindex: 99999,
              title: 'You will be taken the login page',
              position: 'center',
              buttons: [['<button>Go!</button>', (instance, toast) => {
                API.checkAuthAndKickToLogin();
                instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              }, true]],
            });
          }

          this.$nextTick(() => {
            M.updateTextFields();
          });
        }catch(err) {
          iziToast.error({
            title: 'Failed to add user',
            position: 'topCenter',
            timeout: 3500
          });
        }finally {
          this.submitPending = false;
        }
      }
    }
});

const advancedView = Vue.component('advanced-view', {
  data() {
    return {
      params: ADMINDATA.serverParams,
      paramsTS: ADMINDATA.serverParamsUpdated
    };
  },
  template: `
    <div v-if="paramsTS.ts === 0" class="row">
      <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
    </div>
    <div v-else>
      <div class="container">
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Security</span>
                <table>
                  <tbody>
                    <tr>
                      <td><b>File Uploading:</b> {{params.noUpload === false ? 'Enabled' : 'Disabled'}}</td>
                      <td>
                        [<a v-on:click="toggleFileUpload()">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Auth Key:</b> ****************{{params.secret}}</td>
                      <td>
                        [<a v-on:click="generateNewKey()">edit</a>]
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Network Settings</span>
                <table>
                  <tbody>
                    <tr>
                      <td><b>Port:</b> {{params.port}}</td>
                      <td>
                        [<a v-on:click="openModal('edit-port-modal')">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Address:</b> {{params.address}}</td>
                      <td>
                        [<a v-on:click="openModal('edit-address-modal')">edit</a>]
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    openModal: function(modalView) {
      modVM.currentViewModal = modalView;
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    },
    generateNewKey: function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: 'Generate a New Auth Key?',
        message: 'All active login sessions will be invalidated.  You will need to login after',
        position: 'center',
        buttons: [
          [`<button><b>Generate Key</b></button>`, (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            API.axios({
              method: 'POST',
              url: `${API.url()}/api/v1/admin/config/secret`,
              data: { strength: 128 }
            }).then(() => {
              API.checkAuthAndKickToLogin();
            }).catch(() => {
              iziToast.error({
                title: 'Failed',
                position: 'topCenter',
                timeout: 3500
              });
            });
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
    toggleFileUpload: function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `${this.params.noUpload === false ? 'Disable' : 'Enable'} File Uploading?`,
        position: 'center',
        buttons: [
          [`<button><b>${this.params.noUpload === false ? 'Disable' : 'Enable'}</b></button>`, (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            API.axios({
              method: 'POST',
              url: `${API.url()}/api/v1/admin/config/noupload`,
              data: { noUpload: !this.params.noUpload }
            }).then(() => {
              // update fronted data
              Vue.set(ADMINDATA.serverParams, 'noUpload', !this.params.noUpload);

              iziToast.success({
                title: 'Updated Successfully',
                position: 'topCenter',
                timeout: 3500
              });
            }).catch(() => {
              iziToast.error({
                title: 'Failed',
                position: 'topCenter',
                timeout: 3500
              });
            });
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    }
  }
});


const dbView = Vue.component('db-view', {
  data() {
    return {
      dbParams: ADMINDATA.dbParams,
      dbStats: '',
      sharedPlaylists: ADMINDATA.sharedPlaylists,
      sharedPlaylistsTS: ADMINDATA.sharedPlaylistUpdated,
      isPullingStats: false,
      isPullingShared: false
    };
  },
  template: `
    <div>
      <div class="container">
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">DB Scan Settings</span>
                <table>
                  <tbody>
                    <tr>
                      <td><b>Scan Interval:</b> {{dbParams.scanInterval}} hours</td>
                      <td>
                        [<a v-on:click="openModal('edit-scan-interval-modal')">edit</a>]
                      </td>
                    </tr>
                    <tr>
                    <td><b>Save Interval:</b> {{dbParams.saveInterval}} files</td>
                      <td>
                        [<a v-on:click="openModal('edit-save-interval-modal')">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Boot Scan Delay:</b> {{dbParams.bootScanDelay}} seconds</td>
                      <td>
                        [<a v-on:click="openModal('edit-boot-scan-delay-modal')">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Pause Between Files:</b> {{dbParams.pause}} milliseconds</td>
                      <td>
                        [<a v-on:click="openModal('edit-pause-modal')">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Skip Image Metadata:</b> {{dbParams.skipImg}}</td>
                      <td>
                        [<a v-on:click="toggleSkipImg()">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Max Concurrent Scans:</b> {{dbParams.maxConcurrentTasks}}</td>
                      <td>
                        [<a v-on:click="openModal('edit-max-scan-modal')">edit</a>]
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Scan Queue & Stats</span>
                <a v-on:click="scanDB" class="waves-effect waves-light btn">Start A Scan</a>
                <a v-on:click="pullStats" class="waves-effect waves-light btn">Pull Stats</a>
                <div v-if="isPullingStats === true">
                  <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
                </div>
                <pre v-else>
                  {{dbStats}}
                </pre>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Shared Playlists</span>
                <a v-on:click="loadShared" class="waves-effect waves-light btn">Load Playlists</a>
                <br><br>
                <div v-if="isPullingShared === true">
                  <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
                </div>
                <div v-else-if="sharedPlaylistsTS.ts !== 0 && sharedPlaylists.length > 0">
                  [<a v-on:click="deleteUnxpShared">Delete Playlists with no Expiration</a>]
                  <br>
                  [<a v-on:click="deleteExpiredShared">Delete Expired Playlists</a>]
                  <br>
                  <table>
                    <thead>
                      <tr>
                        <th>Playlist ID</th>
                        <th>User</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(v, k) in sharedPlaylists">
                        <th><a target="_blank" v-bind:href="'/shared/'+ v.playlistId">{{v.playlistId}}</a></th>
                        <th>{{v.user}}</th>
                        <th>{{v.expires}}</th>
                        <th>[<a v-on:click="deletePlaylist(v)">delete</a>]</th>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else-if="sharedPlaylistsTS.ts !== 0 && sharedPlaylists.length === 0">
                  No Shared Playlists
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  methods: {
    pullStats: async function() {
      try {
        this.isPullingStats = true;
        const res = await API.axios({
          method: 'GET',
          url: `${API.url()}/api/v1/admin/db/scan/stats`
        });

        this.dbStats = res.data
      } catch (err) {
        iziToast.error({
          title: 'Failed to Pull Data',
          position: 'topCenter',
          timeout: 3500
        });
      } finally {
        this.isPullingStats = false;
      }
    },
    loadShared: async function() {
      try {
        this.isPullingShared = true;
        await ADMINDATA.getSharedPlaylists();
      } catch (err) {
        iziToast.error({
          title: 'Failed to Pull Data',
          position: 'topCenter',
          timeout: 3500
        });
      } finally {
        this.isPullingShared = false;
      }
    },
    deletePlaylist: async function(playlistObj) {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `Delete playlist <b>${playlistObj.playlistId}</b>?`,
        position: 'center',
        buttons: [
          [`<button><b>Delete</b></button>`, async (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            try {
              await ADMINDATA.deleteSharedPlaylist(playlistObj);
            } catch (err) {
              iziToast.error({
                title: 'Failed to Delete Playlist',
                position: 'topCenter',
                timeout: 3500
              });
            }
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
    deleteUnxpShared: async function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `Delete all playlists without expiration dates?`,
        position: 'center',
        buttons: [
          [`<button><b>Delete</b></button>`, async (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            try {
              this.isPullingShared = true;
              await ADMINDATA.deleteUnxpShared();
              await ADMINDATA.getSharedPlaylists();
            } catch (err) {
              iziToast.error({
                title: 'Failed to Delete Shared Playlists',
                position: 'topCenter',
                timeout: 3500
              });
            } finally {
              this.isPullingShared = false;
            }
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
    deleteExpiredShared: async function() {
      try {
        this.isPullingShared = true;
        await ADMINDATA.deleteExpiredShared();
        await ADMINDATA.getSharedPlaylists();
      } catch (err) {
        iziToast.error({
          title: 'Failed to Pull Data',
          position: 'topCenter',
          timeout: 3500
        });
      } finally {
        this.isPullingShared = false;
      }
    },
    scanDB: async function() {
      try {
        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/scan/all`
        });

        iziToast.success({
          title: 'Scan Started',
          position: 'topCenter',
          timeout: 3500
        });
      } catch (err) {
        iziToast.error({
          title: 'Failed to Start Scan',
          position: 'topCenter',
          timeout: 3500
        });
      }
    },
    toggleSkipImg: function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `${this.dbParams.skipImg === true ? 'Disable' : 'Enable'} Image Skip?`,
        position: 'center',
        buttons: [
          [`<button><b>${this.dbParams.skipImg === true ? 'Disable' : 'Enable'}</b></button>`, (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            API.axios({
              method: 'POST',
              url: `${API.url()}/api/v1/admin/db/params/skip-img`,
              data: { skipImg: !this.dbParams.skipImg }
            }).then(() => {
              // update fronted data
              Vue.set(ADMINDATA.dbParams, 'skipImg', !this.dbParams.skipImg);

              iziToast.success({
                title: 'Updated Successfully',
                position: 'topCenter',
                timeout: 3500
              });
            }).catch(() => {
              iziToast.error({
                title: 'Failed',
                position: 'topCenter',
                timeout: 3500
              });
            });
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
    openModal: function(modalView) {
      modVM.currentViewModal = modalView;
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    }
  }
});

const rpnView = Vue.component('rpn-view', {
  data() {
    return {
      tabs: null,
      submitPending: false
    };
  },
  template: `
    <div class="container">
      <div class="row">
        <div class="col s12">
          <h1>mStream RPN</h1>
          <div class="card">
            <ul id="tab-thing" class="tabs tabs-fixed-width">
              <li class="tab"><a class="active" href="#test1">Standard</a></li>
              <li class="tab"><a href="#test2">Advanced</a></li>
            </ul>
            <div id="test1">
              <form @submit.prevent="standardLogin">
                <div class="card-content">
                  <span class="card-title">Login</span>
                  <div class="row">
                    <div class="col s12 m6">
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-simple-username" required type="text">
                          <label for="rpn-simple-username">Username</label>
                        </div>
                      </div>
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-simple-password" required type="password">
                          <label for="rpn-simple-password">Password</label>
                        </div>
                      </div>
                    </div>
                    <div class="col s12 m6 hide-on-small-only">
                      <div class="row">
                        <h5 class="center-align">Help Support mStream</h5>
                      </div>
                      <div class="row">
                        <div class="col s2"></div>
                        <a target="_blank" href="https://mstream.io/reverse-proxy-network" class="col s8 blue darken-3 waves-effect waves-light btn">Sign Up</a>
                        <div class="col s2"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-action">
                  <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
                    {{submitPending === false ? 'Login to RPN' : 'Pending...'}}
                  </button>
                </div>
              </form>
            </div>
            <div id="test2">
              <form @submit.prevent="advancedLogin">
                <div class="card-content">
                  <span class="card-title">Config</span>
                  <div class="row">
                    <div class="col s12 m12 l6">
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-advanced-address" required type="text">
                          <label for="rpn-advanced-address">Server Address</label>
                        </div>
                      </div>
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-advanced-port" required type="number" type="number" min="2" max="65535">
                          <label for="rpn-advanced-port">Port</label>
                        </div>
                      </div>
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-advanced-domain" required type="text">
                          <label for="rpn-advanced-domain">Server Domain</label>
                        </div>
                      </div>
                      <div class="row">
                        <div class="input-field col s12">
                          <input id="rpn-advanced-password" required type="password">
                          <label for="rpn-advanced-password">Server Key</label>
                        </div>
                      </div>
                    </div>
                    <div class="col s12 m12 l6">
                      <h5>
                        <a target="_blank" href="https://github.com/fog-machine/tunnel-server">
                          Check the docs to learn how to deploy your own server
                        </a>
                      </h5>
                    </div>
                  </div>
                </div>
                <div class="card-action">
                  <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
                    {{submitPending === false ? 'Connect To Server' : 'Connecting...'}}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <h4>Features</h4>
        <ul class="browser-default">
          <li>Choose your own domain @ https://your-name.mstream.io</li>
          <li>Automatic SSL Encryption for your server</li>
          <li>'Hole Punching' software guarantees your server stays online as long as you have a working internet connection</li>
          <li>IP Obfuscation hides your IP address and adds an additional layer of security</li>  
        </ul>
      </div>
    </div>`,
  mounted: function () {
    this.tabs = M.Tabs.init(document.getElementById('tab-thing'), {});
    this.tabs.select('test1')
  },
  beforeDestroy: function() {
    this.tabs.destroy();
  },
  methods: {
    standardLogin: function() {
      console.log('STAND')
    },
    advancedLogin: function() {
      console.log('ADV')
    }
  }
});

const infoView = Vue.component('info-view', {
  data() {
    return {

    };
  },
  template: `
    <div class="container">
      <div class="row logo-row-mstream">
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 612 153" xml:space="preserve"><style>.st0,.st1{fill-rule:evenodd;clip-rule:evenodd;fill:#264679}.st1{fill:#6684b2}</style><path class="st0" d="M179.9 45.5c-6.2 0-11.5 1.7-15.9 5s-6.5 8.1-6.5 14.4c0 4.9 1.3 9.1 3.8 12.4 2.5 3.4 5.7 5.8 9.3 7.3 3.7 1.5 7.3 2.8 11 3.8s6.8 2.3 9.3 3.9c2.5 1.5 3.8 3.5 3.8 5.8 0 4.8-4.4 7.2-13.1 7.2h-24.1V118h24.1c17.1 0 25.6-6.7 25.6-20.2 0-1.9-.2-3.8-.6-5.8-.4-2-1.2-4-2.6-6-1.3-2.1-3.3-3.7-5.8-4.9-2.5-1.2-6.4-2.7-11.5-4.5l-8.8-3.1c-.7-.2-1.7-.7-2.9-1.3-1.3-.7-2.2-1.3-2.8-1.9-.6-.6-1.1-1.4-1.6-2.3-.5-.9-.7-2-.7-3.2 0-2 1-3.5 2.9-4.6 1.9-1.1 4.3-1.6 7-1.6h24.6V45.5h-24.5zM226.4 58.3v31c0 10.2 2.5 17.6 7.6 22 5.1 4.4 13 6.6 23.7 6.6v-12.8c-2.7 0-4.9-.2-6.8-.4-1.8-.3-3.7-.9-5.8-1.9-2-.9-3.6-2.6-4.7-4.9-1.1-2.3-1.6-5.2-1.6-8.7V58.3h18.8V45.5h-18.8V31.6L214 58.3h12.4zM281.1 118V76.8c0-7.2.9-12 2.6-14.5 1-1.3 2.2-2.2 3.6-2.8 1.4-.6 2.6-1 3.6-1.1 1-.1 2.5-.1 4.3-.1H310V45.5h-12.2c-3.6 0-6.5.1-8.6.3-2.1.2-4.5.9-7.3 2s-5.1 2.8-7.1 5c-4 4.4-6 12.4-6 24V118h12.3zM326.2 53.8c-6.2 7.4-9.3 17-9.3 28.9 0 10.7 3.2 19.4 9.5 26.2s14.7 10.1 25.3 10.1c8.7 0 16.3-2.7 22.7-8.1L366 102c-3.7 2.1-8.5 3.2-14.3 3.2-6.5 0-11.8-2.3-15.8-6.9-4-4.6-6-10.5-6-17.9 0-7 1.9-12.9 5.6-17.9 3.8-5 8.9-7.5 15.5-7.5 3.3 0 6.1.8 8.2 2.4 2.1 1.6 3.2 4 3.2 7.2 0 5-1.2 8.5-3.6 10.6-2.4 2.1-6.7 3.2-12.9 3.2h-6.7v11.7h5.7c20.3 0 30.5-8.5 30.5-25.4 0-13.6-7.9-20.7-23.7-21.5-10.8-.2-19.3 3.3-25.5 10.6zM412.3 73.2c-7.4 0-13.6 1.9-18.5 5.7-4.9 3.8-7.4 9.4-7.4 16.7 0 7.3 2.3 12.9 7 16.7 4.6 3.8 10.9 5.7 18.8 5.7h31V73.6c0-9.1-2.4-16-7.2-20.8-4.8-4.8-11.7-7.2-20.7-7.2h-22.9v12.8h22.3c10.9 0 16.4 6.1 16.4 18.2v28.7h-18.4c-9.1 0-13.6-3.2-13.6-9.8 0-3.3 1.2-5.9 3.6-7.8 2.4-1.8 5.8-2.7 10.2-2.7 5.1 0 9.4 1.4 12.9 4.3v-14c-4.9-1.4-9.3-2.1-13.5-2.1zM458.8 118H471V58.3h24.4V118h12.2V58.3h5.7c6.8 0 11.3.7 13.5 2 4.3 2.5 6.5 7.7 6.5 15.5V118h12.2V75.7c0-6-.6-11.2-1.9-15.5-1.2-4.3-3.9-7.8-7.9-10.6-3.9-2.7-9.1-4.1-15.7-4.1h-61.4V118z"/><path class="st1" d="M75 118.5v-83l21 13v70z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#26477b" d="M99 118.5v-69l11.5 7 10.5-7v69z"/><path class="st1" d="M124 118.5v-70l21-13v83z"/></svg>
      </div>
      <div class="row">
        <div class="col s12">
          <div class="card">
            <div class="card-content">
              <span class="card-title">Developed & Designed By</span>
              <h3>Paul Sori</h3>
              <h4><a href="mailto:paul.sori@pm.me">paul.sori@pm.me</a></h4>
              <blockquote>
                <h5><b>I am currently looking for work!</b> Send me an email if you would like to hire me.</h5>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </div>`
});

const transcodeView = Vue.component('transcode-view', {
  data() {
    return {
      params: ADMINDATA.transcodeParams,
      paramsTS: ADMINDATA.transcodeParamsUpdated,
      downloadPending: ADMINDATA.downloadPending,
    };
  },
  template: `
    <div class="container">
      <div class="row logo-row">
        <h4>Powered By</h4>
        <?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" xmlns:xlink="http://www.w3.org/1999/xlink" height="120" viewBox="0 0 224.44334 60.186738" version="1.1">
          <defs>
            <radialGradient id="a" gradientUnits="userSpaceOnUse" cy="442.72311" cx="-122.3936" gradientTransform="matrix(1,0,0,-1,134.4463,453.7334)" r="29.5804">
              <stop stop-color="#fff" offset="0"/>
              <stop stop-color="#007808" offset="1"/>
            </radialGradient>
          </defs>
          <g>
            <polygon points="0.511 12.364 0.511 5.078 5.402 6.763 5.402 13.541" fill="#0b4819"/>
            <polygon points="4.455 42.317 4.455 15.226 9.13 16.215 9.13 41.393" fill="#0b4819"/>
            <polygon points="27.321 5.066 15.306 18.846 15.306 24.71 33.126 4.617 61.351 2.432 19.834 45.706 25.361 45.997 55.516 15.154 55.516 44.305 52.166 47.454 60.662 47.913 60.662 55.981 34.012 53.917 47.597 40.738 47.597 34.243 28.175 53.465 4.919 51.667 42.222 11.55 36.083 11.882 9.13 41.393 9.13 16.215 11.683 13.201 5.402 13.541 5.402 6.763" fill="#105c80"/>
            <polygon points="4.455 15.226 7.159 11.971 11.683 13.201 9.13 16.215" fill="#0b4819"/>
            <polygon points="11.004 18.039 15.306 18.846 15.306 24.71 11.004 24.358" fill="#084010"/>
            <polygon points="15.82 47.006 19.834 45.706 25.361 45.997 21.714 47.346" fill="#0c541e"/>
            <polygon points="23.808 3.106 27.321 5.066 15.306 18.846 11.004 18.039" fill="#1a5c34"/>
            <polygon points="11.004 24.358 30.022 2.58 33.126 4.617 15.306 24.71" fill="#0b4819"/>
            <polygon points="33.195 10.432 36.083 11.882 9.13 41.393 4.455 42.317" fill="#1a5c34"/>
            <polygon points="0 53.344 39.798 10.042 42.222 11.55 4.919 51.667" fill="#0b4819"/>
            <polygon points="45.597 34.677 47.597 34.243 28.175 53.465 24.721 55.437" fill="#1a5c34"/>
            <polygon points="45.597 41.737 45.597 34.677 47.597 34.243 47.597 40.738" fill="#0b4819"/>
            <polygon points="30.973 55.965 45.597 41.737 47.597 40.738 34.012 53.917" fill="#0b4819"/>
            <polygon points="54.168 45.648 50.538 49.059 52.166 47.454 55.516 44.305" fill="#13802d"/>
            <polygon points="21.714 47.346 54.168 13.9 55.516 15.154 25.361 45.997" fill="#0b4819"/>
            <polygon points="54.168 13.9 55.516 15.154 55.516 44.305 54.168 45.648" fill="#084010"/>
            <polygon points="59.759 49.604 60.662 47.913 60.662 55.981 59.759 58.403" fill="#084010"/>
            <polygon points="60.507 0 61.351 2.432 19.834 45.706 15.82 47.006" fill="#1a5c34"/>
            <polygon points="23.808 3.106 11.004 18.039 11.004 24.358 30.022 2.58 60.507 0 15.82 47.006 21.714 47.346 54.168 13.9 54.168 45.648 50.538 49.059 59.759 49.604 59.759 58.403 30.973 55.965 45.597 41.737 45.597 34.677 24.721 55.437 0 53.344 39.798 10.042 33.195 10.432 4.455 42.317 4.455 15.226 7.159 11.971 0.511 12.364 0.511 5.078" fill="url(#a)"/>
          </g>
          <g transform="matrix(2.6160433,0,0,2.6160433,70,-145)">
            <polygon points="2.907 66.777 6.825 66.777 6.825 69.229 2.907 69.229 2.907 74.687 0.797 74.687 0.797 74.688 0.797 61.504 8.218 61.504 8.218 63.965 2.907 63.965"/>
            <polygon points="11.13 66.777 15.049 66.777 15.049 69.229 11.13 69.229 11.13 74.687 9.021 74.687 9.021 74.688 9.021 61.504 16.442 61.504 16.442 63.965 11.13 63.965"/>
            <path d="m19.69 69.063v5.625h-2.461v-8.534l2.461-0.264v0.782c0.551-0.517 1.254-0.773 2.109-0.773 1.113 0 1.963 0.337 2.549 1.011 0.645-0.674 1.611-1.011 2.9-1.011 1.113 0 1.963 0.337 2.549 1.011 0.586 0.675 0.879 1.45 0.879 2.329v5.449h-2.461v-4.834c0-0.586-0.132-1.04-0.396-1.362-0.264-0.321-0.691-0.491-1.283-0.51-0.486 0.035-0.908 0.357-1.266 0.967-0.029 0.183-0.044 0.366-0.044 0.555v5.186h-2.461v-4.834c0-0.586-0.132-1.04-0.396-1.362-0.264-0.321-0.689-0.492-1.281-0.511-0.539 0.034-1.005 0.394-1.398 1.08z"/>
            <path d="m31.913 78.379v-12.225l2.461-0.264v0.703c0.656-0.47 1.301-0.703 1.934-0.703 1.348 0 2.417 0.438 3.208 1.317 0.791 0.88 1.187 1.904 1.187 3.076s-0.396 2.197-1.187 3.076-1.86 1.318-3.208 1.318c-0.879-0.06-1.523-0.296-1.934-0.712v4.421l-2.461-0.007zm2.461-8.885v1.425c0.117 0.983 0.732 1.562 1.846 1.73 1.406-0.111 2.197-0.841 2.373-2.188-0.059-1.642-0.85-2.49-2.373-2.55-1.114 0.176-1.729 0.704-1.846 1.583z"/>
            <path d="m41.094 70.293c0-1.289 0.41-2.345 1.23-3.164 0.82-0.82 1.875-1.23 3.164-1.23s2.314 0.41 3.076 1.23c0.762 0.819 1.143 1.875 1.143 3.164v0.879h-6.064c0.059 0.469 0.264 0.835 0.615 1.099s0.762 0.396 1.23 0.396c0.82 0 1.553-0.233 2.197-0.702l1.406 1.405c-0.645 0.879-1.846 1.318-3.604 1.318-1.289 0-2.344-0.41-3.164-1.23s-1.229-1.875-1.229-3.165zm5.625-1.977c-0.352-0.264-0.762-0.396-1.23-0.396s-0.879 0.132-1.23 0.396-0.527 0.63-0.527 1.099h3.516c-0.002-0.469-0.178-0.835-0.529-1.099z"/>
            <path d="m59.037 66.163v7.822c0 1.23-0.366 2.259-1.099 3.085s-1.655 1.263-2.769 1.311l-0.527 0.053c-1.699-0.035-3.018-0.521-3.955-1.459l1.143-1.318c0.645 0.47 1.427 0.732 2.347 0.791 0.938 0 1.572-0.22 1.902-0.659 0.332-0.438 0.497-0.923 0.497-1.449v-0.439c-0.656 0.527-1.418 0.791-2.285 0.791-1.348 0-2.358-0.396-3.032-1.187s-1.011-1.86-1.011-3.208c0-1.289 0.366-2.345 1.099-3.164 0.733-0.82 1.772-1.23 3.12-1.23 0.996 0.06 1.699 0.325 2.109 0.8v-0.8l2.461 0.26zm-2.461 4.921v-1.424c-0.117-0.983-0.732-1.562-1.846-1.73-1.465 0.053-2.256 0.782-2.373 2.188 0.059 1.642 0.85 2.49 2.373 2.55 1.114-0.177 1.729-0.705 1.846-1.584z"/>
          </g>
        </svg>
      </div>
      <div v-if="paramsTS.ts === 0" class="row">
        <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
      </div>
      <div v-else class="row">
        <div class="col s12">
          <div class="card">
            <div class="card-content">
              <span class="card-title">Settings</span>
              <table>
                <tbody>
                  <tr>
                    <td><b>Transcoding:</b> {{params.enabled === true ? 'Enabled' : 'Disabled'}}</td>
                    <td>
                      [<a v-on:click="toggleEnabled()">edit</a>]
                    </td>
                  </tr>
                  <tr>
                    <td><b>FFmpeg Directory:</b> {{params.ffmpegDirectory}}</td>
                    <td>
                      [<a v-on:click="changeFolder()">edit</a>]
                    </td>
                  </tr>
                  <tr>
                    <td><b>FFmpeg Downloaded:</b> {{downloadPending.val === true ? 'pending...' : params.downloaded}}</td>
                    <td>
                      [<a v-on:click="downloadFFMpeg()">download</a>]
                    </td>
                  </tr>
                  <tr>
                    <td><b>Default Codec:</b> {{params.defaultCodec}}</td>
                    <td>
                      [<a v-on:click="changeCodec()">edit</a>]
                    </td>
                  </tr>
                  <tr>
                    <td><b>Default Bitrate:</b> {{params.defaultBitrate}}</td>
                    <td>
                      [<a v-on:click="changeBitrate()">edit</a>]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  methods: {
    toggleEnabled: function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `${this.params.enabled === true ? 'Disable' : 'Enable'} Transcoding?`,
        message: 'Enabling this will download FFmpeg',
        position: 'center',
        buttons: [
          [`<button><b>${this.params.enabled === true ? 'Disable' : 'Enable'}</b></button>`, async (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            try {
              await API.axios({
                method: 'POST',
                url: `${API.url()}/api/v1/admin/transcode/enable`,
                data: { enable: !this.params.enabled }
              });
              Vue.set(ADMINDATA.transcodeParams, 'enabled', !this.params.enabled);

              // download ffmpeg
              if (this.params.enabled === true) { this.downloadFFMpeg(); }

              iziToast.success({
                title: 'Updated Successfully',
                position: 'topCenter',
                timeout: 3500
              });
            } catch (err) {
              iziToast.error({
                title: 'Failed',
                position: 'topCenter',
                timeout: 3500
              });
            }
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
    changeCodec: function() {
      modVM.currentViewModal = 'edit-transcode-codec-modal';
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    },
    changeBitrate: function() {
      modVM.currentViewModal = 'edit-transcode-bitrate-modal';
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    },
    downloadFFMpeg: async function() {
      if (this.downloadPending.val === true) {
        return;
      }

      try {
        this.downloadPending.val = true;
        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/transcode/download`,
        });
        Vue.set(ADMINDATA.transcodeParams, 'downloaded', true);
        iziToast.success({
          title: 'FFmpeg Downloaded',
          position: 'topCenter',
          timeout: 3500
        });
      } catch (err) {
        iziToast.error({
          title: 'Failed To Download FFmpeg',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.downloadPending.val = false;
      }
    },
    changeFolder: function() {
      iziToast.warning({
        title: 'Coming Soon',
        position: 'topCenter',
        timeout: 3500
      });
    }
  }
});

const federationMainPanel = Vue.component('federation-main-panel', {
  data() {
    return {
      params: ADMINDATA.federationParams,
      paramsTS: ADMINDATA.federationParamsUpdated,
      enabled: ADMINDATA.federationEnabled,
      syncthingUrl: '/api/v1/syncthing-proxy/?token=' + API.token(),
      tabs: null,
      enablePending: false
    };
  },
  template: `
    <div>
      <ul id="syncthing-tabs" class="tabs tabs-fixed-width">
        <li class="tab"><a class="active" href="#sync-tab-1">Federation</a></li>
        <li class="tab"><a href="#sync-tab-2">Syncthing</a></li>
      </ul>
      <div id="sync-tab-1">
        <div class="container">
          <div class="row">
            <div class="col s12">
              <div class="card">
                <div class="card-content">
                  <span class="card-title">mStream Federation</span>
                  <table>
                    <tbody>
                      <tr>
                        <td><b>Device ID:</b> {{params.deviceId}}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-on:click="openFederationAcceptInviteModal()">Accept Invite</p>
                  <p v-on:click="openFederationGenerateInviteModal()">Generate Invite Token</p>
                </div>
              </div>
              <a v-on:click="enableFederation()" v-bind:class="{ 'red': enabled.val }" class="waves-effect waves-light btn-large">Disable Federation</a>
            </div>
          </div>
        </div>
      </div>
      <div id="sync-tab-2">
        <iframe id="syncthing-iframe" :src="syncthingUrl"></iframe>
      </div>
    </div>`,
  mounted: function () {
    this.tabs = M.Tabs.init(document.getElementById('syncthing-tabs'), {});
    this.tabs.select('test1')
  },
  beforeDestroy: function() {
    this.tabs.destroy();
  },
  methods: {
    openFederationAcceptInviteModal: function() {
      modVM.currentViewModal = 'federation-accept-invite-modal';
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    },
    openFederationGenerateInviteModal: function() {
      modVM.currentViewModal = 'federation-generate-invite-modal';
      M.Modal.getInstance(document.getElementById('admin-modal')).open();
    },
    enableFederation: async function() {
      try {
        this.enablePending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/federation/enable`,
          data: {
            enable: !this.enabled.val,
          }
        });

        // update fronted data
        Vue.set(ADMINDATA.federationEnabled, 'val', !this.enabled.val);
  
        iziToast.success({
          title: `Syncthing ${this.enabled.val === true ? 'Enabled' : 'Disabled'}`,
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Toggle Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.enablePending = false;
      }
    }
  }
});

const federationView = Vue.component('federation-view', {
  data() {
    return {
      params: ADMINDATA.federationParams,
      paramsTS: ADMINDATA.federationParamsUpdated,
      enabled: ADMINDATA.federationEnabled,
      enablePending: false,
      syncthingUrl: '/api/v1/syncthing-proxy/?token=' + API.token(),
      tabs: null
    };
  },
  template: `
    <div v-if="paramsTS.ts === 0" class="row">
      <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
    </div>
    <div v-else-if="enabled.val === false" class="row">
      <div class="container">
        <div class="row logo-row">
          <h4>Powered By</h4>
          <svg xmlns="http://www.w3.org/2000/svg" max-width="200px" viewBox="0 0 429 117.3"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="58.666" y1="117.332" x2="58.666" y2="0"><stop offset="0" stop-color="#0882c8"/><stop offset="1" stop-color="#26b6db"/></linearGradient><circle fill="url(#a)" cx="58.7" cy="58.7" r="58.7"/><circle fill="none" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" cx="58.7" cy="58.5" r="43.7"/><path fill="#FFF" d="M94.7 47.8c4.7 1.6 9.8-.9 11.4-5.6 1.6-4.7-.9-9.8-5.6-11.4-4.7-1.6-9.8.9-11.4 5.6-1.6 4.7.9 9.8 5.6 11.4z"/><path fill="none" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M97.6 39.4l-30.1 25"/><path fill="#FFF" d="M77.6 91c-.4 4.9 3.2 9.3 8.2 9.8 5 .4 9.3-3.2 9.8-8.2.4-4.9-3.2-9.3-8.2-9.8-5-.4-9.4 3.2-9.8 8.2z"/><path fill="none" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M86.5 91.8l-19-27.4"/><path fill="#FFF" d="M60 69.3c2.7 4.2 8.3 5.4 12.4 2.7 4.2-2.7 5.4-8.3 2.7-12.4-2.7-4.2-8.3-5.4-12.4-2.7-4.2 2.6-5.4 8.2-2.7 12.4z"/><g><path fill="#FFF" d="M21.2 61.4c-4.3-2.5-9.8-1.1-12.3 3.1-2.5 4.3-1.1 9.8 3.1 12.3 4.3 2.5 9.8 1.1 12.3-3.1s1.1-9.7-3.1-12.3z"/><path fill="none" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M16.6 69.1l50.9-4.7"/></g><g fill="#0891D1"><path d="M163.8 50.2c-.6-.7-6.3-4.1-11.4-4.1-3.4 0-5.2 1.2-5.2 3.5 0 2.9 3.2 3.7 8.9 5.2 8.2 2.2 13.3 5 13.3 12.9 0 9.7-7.8 13-16 13-6.2 0-13.1-2-18.2-5.3l4.3-8.6c.8.8 7.5 5 14 5 3.5 0 5.2-1.1 5.2-3.2 0-3.2-4.4-4-10.3-5.8-7.9-2.4-11.5-5.3-11.5-11.8 0-9 7.2-13.9 15.7-13.9 6.1 0 11.6 2.5 15.4 4.7l-4.2 8.4zM175 85.1c1.7.5 3.3.8 4.4.8 2 0 3.3-1.5 4.2-5.5l-11.9-31.5h9.8l7.4 23.3 6.3-23.3h8.9L192 85.5c-1.7 5.3-6.2 8.7-11.8 8.8-1.7 0-3.5-.2-5.3-.9v-8.3zM239.3 80.3h-9.6V62.6c0-4.1-1.7-5.9-4.3-5.9-2.6 0-5.8 2.3-7 5.6v18.1h-9.6V48.8h8.6v5.3c2.3-3.7 6.8-5.9 12.2-5.9 8.2 0 9.5 6.7 9.5 11.9v20.2zM261.6 48.2c7.2 0 12.3 3.4 14.8 8.3l-9.4 2.8c-1.2-1.9-3.1-3-5.5-3-4 0-7 3.2-7 8.2 0 5 3.1 8.3 7 8.3 2.4 0 4.6-1.3 5.5-3.1l9.4 2.9c-2.3 4.9-7.6 8.3-14.8 8.3-10.6 0-16.9-7.7-16.9-16.4s6.2-16.3 16.9-16.3zM302.1 78.7c-2.6 1.1-6.2 2.3-9.7 2.3-4.7 0-8.8-2.3-8.8-8.4V56.1h-4v-7.3h4v-10h9.6v10h6.4v7.3h-6.4v13.1c0 2.1 1.2 2.9 2.8 2.9 1.4 0 3-.6 4.2-1.1l1.9 7.7zM337.2 80.3h-9.6V62.6c0-4.1-1.8-5.9-4.6-5.9-2.3 0-5.5 2.2-6.7 5.6v18.1h-9.6V36.5h9.6v17.6c2.3-3.7 6.3-5.9 10.9-5.9 8.5 0 9.9 6.5 9.9 11.9v20.2zM343.4 45.2v-8.7h9.6v8.7h-9.6zm0 35.1V48.8h9.6v31.5h-9.6zM389.9 80.3h-9.6V62.6c0-4.1-1.7-5.9-4.3-5.9-2.6 0-5.8 2.3-7 5.6v18.1h-9.6V48.8h8.6v5.3c2.3-3.7 6.8-5.9 12.2-5.9 8.2 0 9.5 6.7 9.5 11.9v20.2zM395.5 64.6c0-9.2 6-16.3 14.6-16.3 4.7 0 8.4 2.2 10.6 5.8v-5.2h8.3v29.3c0 9.6-7.5 15.5-18.2 15.5-6.8 0-11.5-2.3-15-6.3l5.1-5.2c2.3 2.6 6 4.3 9.9 4.3 4.6 0 8.6-2.4 8.6-8.3v-3.1c-1.9 3.5-5.9 5.3-10 5.3-8.3.1-13.9-7.1-13.9-15.8zm23.9 3.9v-6.6c-1.3-3.3-4.2-5.5-7.1-5.5-4.1 0-7 4-7 8.4 0 4.6 3.2 8 7.5 8 2.9 0 5.3-1.8 6.6-4.3z"/></g></svg>
        </div>
        <a v-on:click="enableFederation()" class="waves-effect waves-light btn-large">Enable Federation</a>
      </div>
    </div>
    <federation-main-panel v-else>
    </federation-main-panel>`,
  methods: {
    enableFederation: async function() {
      try {
        this.enablePending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/federation/enable`,
          data: {
            enable: !this.enabled.val,
          }
        });

        // update fronted data
        Vue.set(ADMINDATA.federationEnabled, 'val', !this.enabled.val);
  
        iziToast.success({
          title: `Syncthing ${this.enabled.val === true ? 'Enabled' : 'Disabled'}`,
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Toggle Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.enablePending = false;
      }
    }
  }
});

const logsView = Vue.component('logs-view', {
  data() {
    return {
      params: ADMINDATA.serverParams,
      paramsTS: ADMINDATA.serverParamsUpdated
    };
  },
  template: `
    <div v-if="paramsTS.ts === 0" class="row">
      <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
    </div>
    <div v-else>
      <div class="container">
        <div class="row">
          <div class="col s12">
            <div class="card">
              <div class="card-content">
                <span class="card-title">Logging</span>
                <table>
                  <tbody>
                    <tr>
                      <td><b>Write Logs:</b> {{params.writeLogs === true ? 'Enabled' : 'Disabled'}}</td>
                      <td>
                        [<a v-on:click="toggleWriteLogs">edit</a>]
                      </td>
                    </tr>
                    <tr>
                      <td><b>Logs Directory:</b> {{params.storage.logsDirectory}}</td>
                      <td>
                        [<a v-on:click="changeLogsDir()">edit</a>]
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="card-action">
                <a v-on:click="downloadLogs()" class="waves-effect waves-light btn">Download Log File</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`,
  methods: {
    changeLogsDir: function() {
      iziToast.warning({
        title: 'Coming Soon',
        position: 'topCenter',
        timeout: 3500
      });
    },
    downloadLogs: async function() {
      try {
        const response = await API.axios({
          url: `${API.url()}/api/v1/admin/logs/download`, //your url
          method: 'GET',
          responseType: 'blob', // important
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'mstream-logs.zip'); //or any other extension
        document.body.appendChild(link);
        link.click();
      } catch (err) {
        console.log(err)
        iziToast.error({
          title: 'Download Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }
    },
    toggleWriteLogs: function() {
      iziToast.question({
        timeout: 20000,
        close: false,
        overlayClose: true,
        overlay: true,
        displayMode: 'once',
        id: 'question',
        zindex: 99999,
        layout: 2,
        maxWidth: 600,
        title: `${this.params.writeLogs === true ? 'Disable' : 'Enable'} Writing Logs To Disk?`,
        position: 'center',
        buttons: [
          [`<button><b>${this.params.writeLogs === true ? 'Disable' : 'Enable'}</b></button>`, (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            API.axios({
              method: 'POST',
              url: `${API.url()}/api/v1/admin/config/write-logs`,
              data: { writeLogs: !this.params.writeLogs }
            }).then(() => {
              // update fronted data
              Vue.set(ADMINDATA.serverParams, 'writeLogs', !this.params.writeLogs);

              iziToast.success({
                title: 'Updated Successfully',
                position: 'topCenter',
                timeout: 3500
              });
            }).catch(() => {
              iziToast.error({
                title: 'Failed',
                position: 'topCenter',
                timeout: 3500
              });
            });
          }, true],
          ['<button>Go Back</button>', (instance, toast) => {
            instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
          }],
        ]
      });
    },
  }
});

const lockView = Vue.component('lock-view', {
  data() {
    return {};
  },
  template: `
    <div class="container">
      <div class="row">
        <h2>Lock Admin Panel</h2>
        <p>
          This will prevent anyone from making configuration changes with the Admin Panel. If you want undo this you will need to:
          <br><br>
          -- Open the config file<br>
          -- Change the value of 'lockAdmin' to 'true'<br>
          -- Reboot mStream
        </p>
        <br>
        <a class="waves-effect waves-light btn-large" v-on:click="disableAdmin()">Disable Admin Panel</a>
      </div>
    </div>`,
    methods: {
      disableAdmin: function() {
        iziToast.question({
          timeout: 20000,
          close: false,
          overlayClose: true,
          overlay: true,
          displayMode: 'once',
          id: 'question',
          zindex: 99999,
          layout: 2,
          maxWidth: 600,
          title: 'Disable Admin Panel?',
          position: 'center',
          buttons: [
            [`<button><b>Disable</b></button>`, (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
              API.axios({
                method: 'POST',
                url: `${API.url()}/api/v1/admin/lock-api`,
                data: { lock: true }
              }).then(() => {
                window.location.reload();
              }).catch(() => {
                iziToast.error({
                  title: 'Failed to disable admin panel',
                  position: 'topCenter',
                  timeout: 3500
                });
              });
            }, true],
            ['<button>Go Back</button>', (instance, toast) => {
              instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
            }],
          ]
        });
      }
    }
});

const vm = new Vue({
  el: '#content',
  components: {
    'folders-view': foldersView,
    'users-view': usersView,
    'db-view': dbView,
    'advanced-view': advancedView,
    'info-view': infoView,
    'transcode-view': transcodeView,
    'federation-view': federationView,
    'logs-view': logsView,
    'rpn-view': rpnView,
    'lock-view': lockView,
  },
  data: {
    currentViewMain: 'folders-view',
    componentKey: false
  }
});

function changeView(viewName, el){
  if (vm.currentViewMain === viewName) { return; }

  document.getElementById('content').scrollTop = 0;
  vm.currentViewMain = viewName;

  const elements = document.querySelectorAll('.side-nav-item'); // or:
  elements.forEach(elm => {
    elm.classList.remove("select")
  });

  el.classList.add("select");

  // close nav on mobile
  closeSideMenu();
}

const fileExplorerModal = Vue.component('file-explorer-modal', {
  data() {
    return {
      componentKey: false, // Flip this value to force re-render,
      pending: false,
      currentDirectory: null,
      contents: []
    };
  },
  template: `
    <div>
      <div class="row">
        <h5>File Explorer</h5>
        <span>
          [<a v-on:click="goToDirectory(currentDirectory, '..')">back</a>]
          [<a v-on:click="goToDirectory('~')">home</a>]
          [<a v-on:click="goToDirectory(currentDirectory)">refresh</a>]
        </span>
      </div>
      <div v-show="currentDirectory === null || pending === true" class="row">
        <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="spinner-path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>
      </div>
      <div v-show="currentDirectory !== null" class="row">
        <h6>{{currentDirectory}}</h6>
        [<a v-on:click="selectDirectory(currentDirectory)">Select Current Directory</a>]
        <ul class="collection">
          <li v-on:click="goToDirectory(currentDirectory, dir.name)" v-for="dir in contents" class="collection-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="32.4px"><path fill="#FFA000" d="M38 12H22l-4-4H8c-2.2 0-4 1.8-4 4v24c0 2.2 1.8 4 4 4h31c1.7 0 3-1.3 3-3V16c0-2.2-1.8-4-4-4z"/><path fill="#FFCA28" d="M42.2 18H15.3c-1.9 0-3.6 1.4-3.9 3.3L8 40h31.7c1.9 0 3.6-1.4 3.9-3.3l2.5-14c.5-2.4-1.4-4.7-3.9-4.7z"/></svg>
            <div>{{dir.name}}</div>
            <a v-on:click.stop="selectDirectory(currentDirectory, dir.name)" class="secondary-content waves-effect waves-light btn-small">Select</a>
          </li>
        </ul>
      </div>
    </div>`,
  created: async function () {
    this.goToDirectory('~');
  },
  methods: {
    goToDirectory: async function (dir, joinDir) {
      try {
        const params = { directory: dir };
        if (joinDir) { params.joinDirectory = joinDir; }
  
        const res = await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/file-explorer`,
          data: params
        });
  
        this.currentDirectory = res.data.path
  
        while (this.contents.length > 0) {
          this.contents.pop();
        }
  
        res.data.directories.forEach(d => {
          this.contents.push(d);
        });

        this.$nextTick(() => {
          document.getElementById('dynamic-modal').scrollIntoView();
        });
      } catch(err) {
        iziToast.error({
          title: 'Failed to get directory contents',
          position: 'topCenter',
          timeout: 3500
        });
      }
    },
    selectDirectory: async function (dir, joinDir) {
      try {
        let selectThis = dir;

        if (joinDir) {
          const res = await API.axios({
            method: 'POST',
            url: `${API.url()}/api/v1/admin/file-explorer`,
            data: { directory: dir, joinDirectory: joinDir }
          });  
  
          selectThis = res.data.path
        }
  
        Vue.set(ADMINDATA.sharedSelect, 'value', selectThis);
  
        // close the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();
      }catch(err) {
        iziToast.error({
          title: 'Cannot Select Directory',
          position: 'topCenter',
          timeout: 3500
        });
      }
    }
  }
});

const userPasswordView = Vue.component('user-password-view', {
  data() {
    return {
      users: ADMINDATA.users,
      currentUser: ADMINDATA.selectedUser,
      resetPassword: '',
      submitPending: false
    };
  }, 
  template: `
    <form @submit.prevent="updatePassword">
      <div class="modal-content">
        <h4>Password Reset</h4>
        <p>User: <b>{{currentUser.value}}</b></p>
        <div class="input-field">
          <input v-model="resetPassword" id="reset-password" required type="password">
          <label for="reset-password">New Password</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update Password' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  methods: {
    updatePassword: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/users/password`,
          data: {
            username: this.currentUser.value,
            password: this.resetPassword
          }
        });  
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Password Updated',
          position: 'topCenter',
          timeout: 3500
        });
      }catch(err) {
        iziToast.error({
          title: 'Password Reset Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const usersVpathsView = Vue.component('user-vpaths-view', {
  data() {
    return {
      users: ADMINDATA.users,
      directories: ADMINDATA.folders,
      currentUser: ADMINDATA.selectedUser,
      submitPending: false,
      selectInstance: null
    };
  },
  template: `
    <form @submit.prevent="updateFolders">
      <div class="modal-content">
        <h4>Change Folders</h4>
        <p>User: <b>{{currentUser.value}}</b></p>
        <select :disabled="Object.keys(directories).length === 0" id="edit-user-dirs" multiple>
          <option :selected="users[currentUser.value].vpaths.includes(value)" v-for="(key, value) in directories" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
    mounted: function () {
      this.selectInstance = M.FormSelect.init(document.querySelectorAll("#edit-user-dirs"));
    },
    beforeDestroy: function() {
      this.selectInstance[0].destroy();
    },
    methods: {
      updateFolders: async function() {
        try {
          this.submitPending = true;

          await API.axios({
            method: 'POST',
            url: `${API.url()}/api/v1/admin/users/vpaths`,
            data: {
              username: this.currentUser.value,
              vpaths: this.selectInstance[0].getSelectedValues()
            }
          });

          // update fronted data
          Vue.set(ADMINDATA.users[this.currentUser.value], 'vpaths', this.selectInstance[0].getSelectedValues());
    
          // close & reset the modal
          M.Modal.getInstance(document.getElementById('admin-modal')).close();
  
          iziToast.success({
            title: 'User Permissions Updated',
            position: 'topCenter',
            timeout: 3500
          });
        } catch(err) {
          iziToast.error({
            title: 'Failed to Update Folders',
            position: 'topCenter',
            timeout: 3500
          });
        }finally {
          this.submitPending = false;
        }
      }
    }
});

const userAccessView = Vue.component('user-access-view', {
  data() {
    return {
      users: ADMINDATA.users,
      currentUser: ADMINDATA.selectedUser,
      submitPending: false,
      isAdmin: ADMINDATA.users[ADMINDATA.selectedUser.value].admin
    };
  },
  template: `
    <form @submit.prevent="updateUser">
      <div class="modal-content">
        <h4>Change User Access</h4>
        <p>User: <b>{{currentUser.value}}</b></p>
        <div class="pad-checkbox"><label>
          <input id="folder-autoaccess" type="checkbox" v-model="isAdmin"/>
          <span>Admin</span>
        </label></div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
    methods: {
      updateUser: async function() {
        try {

          // TODO: Warn user if they are removing admin status from the last admin user
            // They will lose all access to the admin panel

          this.submitPending = true;

          await API.axios({
            method: 'POST',
            url: `${API.url()}/api/v1/admin/users/access`,
            data: {
              username: this.currentUser.value,
              admin: this.isAdmin
            }
          });

          // update fronted data
          Vue.set(ADMINDATA.users[this.currentUser.value], 'admin', this.isAdmin);
    
          // close & reset the modal
          M.Modal.getInstance(document.getElementById('admin-modal')).close();
  
          iziToast.success({
            title: 'User Permissions Updated',
            position: 'topCenter',
            timeout: 3500
          });
        } catch(err) {
          iziToast.error({
            title: 'Failed to Update User',
            position: 'topCenter',
            timeout: 3500
          });
        }finally {
          this.submitPending = false;
        }
      }
    }
});

const editPortModal = Vue.component('edit-port-modal', {
  data() {
    return {
      params: ADMINDATA.serverParams,
      submitPending: false,
      currentPort: ADMINDATA.serverParams.port
    };
  },
  template: `
    <form @submit.prevent="updatePort">
      <div class="modal-content">
        <h4>Change Port</h4>
        <div class="input-field">
          <input v-model="currentPort" id="edit-port" required type="number" min="2" max="65535">
          <label for="edit-port">Edit Port</label>
        </div>
        <blockquote>
          Requires a reboot.
        </blockquote>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updatePort: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/config/port`,
          data: { port: this.currentPort }
        });

        // update fronted data
        Vue.set(ADMINDATA.serverParams, 'port', this.currentPort);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Port Updated.  Server is rebooting',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Failed to Update Port',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editAddressModal = Vue.component('edit-address-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.serverParams.address
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Server Address</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-server-address" required type="text">
          <label for="edit-server-address">Server Address</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/config/address`,
          data: { address: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.serverParams, 'address', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Address Updated.  Server is rebooting',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editMaxScanModal = Vue.component('edit-max-scans-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.dbParams.maxConcurrentTasks
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Max Concurrent Scans</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-max-scans" required type="number" min="1">
          <label for="edit-max-scans">Edit Max Scans</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/params/max-concurrent-scans`,
          data: { maxConcurrentTasks: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.dbParams, 'maxConcurrentTasks', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editPauseModal = Vue.component('edit-pause-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.dbParams.pause
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Scan Pause</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-db-pause" required type="number" min="1">
          <label for="edit-db-pause">Edit Pause</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/params/pause`,
          data: { pause: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.dbParams, 'pause', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editBootScanView = Vue.component('edit-boot-scan-delay-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.dbParams.bootScanDelay
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Boot Scan Delay</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-scan-delay" required type="number" min="1">
          <label for="edit-scan-delay">Boot Scan Delay</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/params/boot-scan-delay`,
          data: { bootScanDelay: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.dbParams, 'bootScanDelay', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editSaveIntervalView = Vue.component('edit-save-interval-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.dbParams.saveInterval
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Save Interval</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-save-interval" required type="number" min="1">
          <label for="edit-save-interval">Save Interval</label>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/params/save-interval`,
          data: { saveInterval: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.dbParams, 'saveInterval', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editScanIntervalView = Vue.component('edit-scan-interval-modal', {
  data() {
    return {
      params: ADMINDATA.dbParams,
      submitPending: false,
      editValue: ADMINDATA.dbParams.scanInterval
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Edit Scan Interval</h4>
        <div class="input-field">
          <input v-model="editValue" id="edit-scan-interval" required type="number" min="0">
          <label for="edit-scan-interval">Scan Interval</label>
          <span class="helper-text">Set to '0' to disable automatic scans</span>
        </div>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    M.updateTextFields();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/db/params/scan-interval`,
          data: { scanInterval: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.dbParams, 'scanInterval', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editTranscodeCodecModal = Vue.component('edit-transcode-codec-modal', {
  data() {
    return {
      params: ADMINDATA.transcodeParams,
      submitPending: false,
      editValue: ADMINDATA.transcodeParams.defaultCodec,
      selectInstance: null
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Set Default Codec</h4>
        <select v-model="editValue" id="transcode-codec-dropdown">
          <option value="mp3">MP3</option>
          <option value="opus">Opus</option>
          <option value="aac">AAC</option>
        </select>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    this.selectInstance = M.FormSelect.init(document.querySelectorAll("#transcode-codec-dropdown"));
  },
  beforeDestroy: function() {
    this.selectInstance[0].destroy();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/transcode/default-codec`,
          data: { defaultCodec: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.transcodeParams, 'defaultCodec', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const editTranscodeDefaultBitrate = Vue.component('edit-transcode-bitrate-modal', {
  data() {
    return {
      params: ADMINDATA.transcodeParams,
      submitPending: false,
      editValue: ADMINDATA.transcodeParams.defaultBitrate,
      selectInstance: null
    };
  },
  template: `
    <form @submit.prevent="updateParam">
      <div class="modal-content">
        <h4>Set Default Bitrate</h4>
        <select v-model="editValue" id="transcode-bitrate-dropdown">
          <option value="64k">64k</option>
          <option value="96k">96k</option>
          <option value="128k">128k</option>
          <option value="192k">192k</option>
        </select>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-close waves-effect waves-green btn-flat">Go Back</a>
        <button class="btn green waves-effect waves-light" type="submit" :disabled="submitPending === true">
          {{submitPending === false ? 'Update' : 'Updating...'}}
        </button>
      </div>
    </form>`,
  mounted: function () {
    this.selectInstance = M.FormSelect.init(document.querySelectorAll("#transcode-bitrate-dropdown"));
  },
  beforeDestroy: function() {
    this.selectInstance[0].destroy();
  },
  methods: {
    updateParam: async function() {
      try {
        this.submitPending = true;

        await API.axios({
          method: 'POST',
          url: `${API.url()}/api/v1/admin/transcode/default-bitrate`,
          data: { defaultBitrate: this.editValue }
        });

        // update fronted data
        Vue.set(ADMINDATA.transcodeParams, 'defaultBitrate', this.editValue);
  
        // close & reset the modal
        M.Modal.getInstance(document.getElementById('admin-modal')).close();

        iziToast.success({
          title: 'Updated Successfully',
          position: 'topCenter',
          timeout: 3500
        });
      } catch(err) {
        iziToast.error({
          title: 'Update Failed',
          position: 'topCenter',
          timeout: 3500
        });
      }finally {
        this.submitPending = false;
      }
    }
  }
});

const lastFMModal = Vue.component('lastfm-modal', {
  data() {
    return {
      lastFMUser: '',
      lastFMPassword: '',
    };
  },
  template: `
    <div>
      Coming Soon
    </div>`,
  methods: {
    setLastFM: async function() {
      try {

      } catch(err) {
        
      }
    }
  }
});

const federationAcceptInviteModal = Vue.component('federation-accept-invite-modal', {
  data() {
    return {

    };
  },
  template: `
    <div>
      <form id="acceptInvitationForm">
        <label for="federation-invitation-code"><b>Federation Code</b></label>
        <textarea id="federation-invitation-code" rows="16" cols="60" required placeholder="Paste your invitation code here. mStream will start syncing immediately"></textarea>
        <div id="federation-invite-selection-panel">

        </div>
        <input id="invitation-submit" type="submit" class="" value="Submit">
      </form>
    </div>`,
  methods: {
    setLastFM2: async function() {
  // var fedTokenCache;

        //   var newHtml = '<p>Select and name folders you want to federate:</p>';
  //   try {
  //     var decoded = jwt_decode(e.target.value);
  //     if (fedTokenCache === decoded.iat) {
  //       return;
  //     }

  //     fedTokenCache = decoded.iat;
  //     Object.keys(decoded.vPaths).forEach(function(key) {
  //       newHtml += '&nbsp;&nbsp;&nbsp;<input type="checkbox" name="federation-folder" value="'+decoded.vPaths[key]+'" checked>&nbsp;&nbsp;&nbsp;<span class="federation-invite-thing"><input id="'+decoded.vPaths[key]+'" type="text" value="'+key+'"></span><br>';
  //     });
  //   }catch (err) {
  //     fedTokenCache = null;
  //     newHtml = 'ERROR: Failed to decode token';
  //   }

  //   $('#federation-invite-selection-panel').html(newHtml);
    },
    setLastFM: async function() {
  //   var folderNames = {};

  //   var decoded = jwt_decode($('#federation-invitation-code').val());
  //   Object.keys(decoded.vPaths).forEach(function(key) {
  //     if($("input[type=checkbox][value="+decoded.vPaths[key]+"]").is(":checked")){
  //       folderNames[key] = $("#" + decoded.vPaths[key]).val();
  //     }
  //   });

  //   if (Object.keys(folderNames).length === 0) {
  //     iziToast.error({
  //       title: 'No directories selected',
  //       position: 'topCenter',
  //       timeout: 3500
  //     });
  //   }

  //   var sendThis = {
  //     invite: $('#federation-invitation-code').val(),
  //     paths: folderNames
  //   };

  //   MSTREAMAPI.acceptFederationInvite(sendThis, function(res, err){
  //     if (err !== false) {
  //       boilerplateFailure(res, err);
  //       return;
  //     }

  //     iziToast.success({
  //       title: 'Federation Successful!',
  //       position: 'topCenter',
  //       timeout: 3500
  //     });
  //   });
    }
  }
});

const federationGenerateInvite = Vue.component('federation-generate-invite-modal', {
  data() {
    return {

    };
  },
  template: `
    <div>
      <form id="generateInviteForm">
        <label class="invite-federation-url" for="invite-public-url"><b>Federation URL</b></label>
        <input class="invite-federation-url" autocomplete="off" id="invite-public-url" type="text" required>

        <label class="invite-federation-id" for="invite-federation-id"><b>Federation ID</b></label>
        <input placeholder="xxxxxxx-xxxxxxx-xxxxxxx-xxxxxxx-xxxxxxx-xxxxxxx" autocomplete="off"class="invite-federation-id" id="invite-federation-id" type="text" required>

        <div class="row">
          <div class="">
            <label><b>Folders to share</b></label>
            <div id="federation-invite-checkbox-area"></div>
            <!-- TODO: populate this area -->  
          </div>
          <div class="">
            <label><b>Expires In</b></label>
            <input id="federation-invite-time" value="14" class="form-control" type="text" pattern="[0-9]+">
            <span class="share-time-post postfix radius">Days</span>
            <br>
            <input id="federation-invite-forever" type="checkbox" name="forever" value="forever">
            <label for="federation-invite-forever">No Expiration</label>
          </div>
        </div>
        <input id="generate-invite" type="submit" class="" value="Create Invite">
      </form>
      <textarea id="fed-textarea" rows="16" cols="60" placeholder="Your invite token will be put here" readonly="readonly"></textarea>
      <a href="#" class="fed-copy-button" data-clipboard-target="#fed-textarea">Copy To Clipboard</a>
    </div>`,
  methods: {
    setLastFM: async function() {
  //   event.preventDefault();

  //   // get list of vpaths
  //   var vpaths = [];
  //   $('input[name="federate-this"]:checked').each(function () {
  //     vpaths.push($(this).val());
  //   });

  //   if(vpaths.length === 0) {
  //     iziToast.error({
  //       title: 'Nothing to Federate',
  //       position: 'topCenter',
  //       timeout: 3500
  //     });
  //     return;
  //   }

  //   var expirationTimeInDays;
  //   if ($('#federation-invite-forever').prop('checked')) {
  //     expirationTimeInDays = false;
  //   } else {
  //     expirationTimeInDays = $('#federation-invite-time').val();
  //   }

  //   var inviteReq = {
  //     paths: vpaths,
  //     expirationTimeInDays: expirationTimeInDays
  //   };

  //   if ($('#invite-federation-id').is(':enabled')) {
  //     inviteReq.federationId = $('#invite-federation-id').val()
  //   }

  //   if ($('#invite-public-url').is(':enabled')) {
  //     inviteReq.url = $('#invite-public-url').val()
  //   }

  //   MSTREAMAPI.generateFederationInvite(inviteReq, function(res, err) {
  //     if (err !== false) {
  //       boilerplateFailure(res, err);
  //       return;
  //     }
  //     $('#fed-textarea').val(res.token);
  //   });
    }
  }
});


const nullModal = Vue.component('null-modal', {
  template: '<div>NULL MODAL ERROR: How did you get here?</div>'
});

const modVM = new Vue({
  el: '#dynamic-modal',
  components: {
    'user-password-modal': userPasswordView,
    'user-vpaths-modal': usersVpathsView,
    'user-access-modal': userAccessView,
    'file-explorer-modal': fileExplorerModal,
    'edit-port-modal': editPortModal,
    'edit-address-modal': editAddressModal,
    'edit-scan-interval-modal': editScanIntervalView,
    'edit-save-interval-modal': editSaveIntervalView,
    'edit-boot-scan-delay-modal': editBootScanView,
    'edit-select-codec-modal': editTranscodeCodecModal,
    'edit-transcode-bitrate-modal': editTranscodeDefaultBitrate,
    'edit-pause-modal': editPauseModal,
    'edit-max-scan-modal': editMaxScanModal,
    'lastfm-modal': lastFMModal,
    'federation-accept-invite-modal': federationAcceptInviteModal,
    'federation-generate-invite-modal': federationGenerateInvite,
    'null-modal': nullModal
  },
  data: {
    currentViewModal: 'null-modal'
  }
});
