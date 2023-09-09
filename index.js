const todo_app = Vue.createApp({
  data() {
    return {
      allPlans: [],
      currentPlan: "",
      selectedPerson: "",
      todos: [],
      api: "https://api.dse00.com:3000",
      // api: "http://localhost:3002",
      focusTodo: null,
      filterUrgent: null,
      filterDeadline: "",
      filterCategory: 0,
      showHiddenTodo: false,
      TodoDragged: {},
      isLoading: false,
      showMyDiary: false,
      loggers: [],
      seachKeyword: "",
      socketMessage: "",
      socketIcon: "👼🏻👼🏻",
      socket: null,
      categories: ["slate", "lime", "rose", "blue", "yellow", "purple"],
      showNewPlanDialog: true,
      planPassword: {},
      showSecretPlan: false,
    };
  },
  async mounted() {
    document.querySelector("#todo_app").style.opacity = "100";
    this.selectedPerson = Cookies.get("selectedPerson") || "";
    await this.loadAllPlans();
    this.loadTodo();
    this.connectSocket();
  },
  methods: {
    async enterPlanPassword(e) {
      const password = this.planPassword[this.currentPlan._id];
      if (password !== this.currentPlan.password) {
        this.planPassword[this.currentPlan._id] = "";
        this.open("error", "Wrong Password");
        return;
      }
      Cookies.set(this.currentPlan.title, password);
      this.loadTodo();
      this.showSecretPlan = true;
      this.open("success", "Success");
    },
    enterPlanPasswordKeyUp(e) {
      if (e.key === "Enter") {
        this.enterPlanPassword();
      }
    },
    async loadTodo() {
      if (
        this.currentPlan.password &&
        Cookies.get(this.currentPlan.title) !== this.currentPlan.password
      )
        return;
      const planId = this.currentPlan._id;
      this.todos = await this.makeRequest(`todos?planId=${planId || ""}`);
      this.isLoading = false;
    },
    async loadAllPlans() {
      this.allPlans = await this.makeRequest("plans");
      this.isLoading = false;
      const currentPlanId = Cookies.get("currentPlan");
      if (currentPlanId && currentPlanId !== "undefined") {
        this.changePlan(currentPlanId);
      } else {
        this.changePlan(this.allPlans[0]?._id);
      }
      this.planPassword[this.currentPlan._id] = Cookies.get(
        this.currentPlan.title
      );
    },
    open(status, message) {
      ElementPlus.ElMessage({
        showClose: false,
        message: message,
        type: status,
        // customClass:'text-3xl'
      });
    },
    async makeRequest(url, method = "GET", params = {}) {
      if (method !== "GET" && Cookies.get("password") !== "899009") {
        const password = prompt("password to make change");
        if (password !== "899009") return;
        Cookies.set("password", password);
      }
      this.isLoading = true;
      const fullUrl = `${this.api}/${url}`;
      let _response;
      if (method === "GET") {
        _response = await fetch(fullUrl);
      } else {
        _response = await fetch(fullUrl, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
      }
      return _response.json();
    },
    async stepUp(id, s) {
      if (s === 3) return;
      if (s === 2) {
        const yes = confirm("confirm hidden?");
        if (!yes) return;
      }

      this.todos[this.todos.findIndex((i) => i._id === id)].status = s + 1;
      await this.makeRequest(`todos/${id}`, "PUT", {
        status: s + 1,
      });
      this.loadTodo();
    },
    async stepDown(id, s) {
      if (s === -1) return;
      if (s === 0) {
        const yes = confirm("confirm delete?");
        if (!yes) return;
      }
      this.todos[this.todos.findIndex((i) => i._id === id)].status = s - 1;
      await this.makeRequest(`todos/${id}`, "PUT", {
        status: s - 1,
      });
      this.loadTodo();
    },
    async submitTodoTitle(id, e) {
      this.todos[this.todos.findIndex((i) => i._id === id)].title =
        e.target.value;
      await this.makeRequest(`todos/${id}`, "PUT", {
        title: e.target.value,
      });
      this.isLoading = false;
    },
    async submitTodoDescription(id, e) {
      this.todos[this.todos.findIndex((i) => i._id === id)].description =
        e.target.value;

      await this.makeRequest(`todos/${id}`, "PUT", {
        description: e.target.value || null,
      });
      this.isLoading = false;
    },
    async toggleUrgent(id, u) {
      this.todos[this.todos.findIndex((i) => i._id === id)].urgent =
        u === 3 ? 0 : u + 1;
      await this.makeRequest(`todos/${id}`, "PUT", {
        urgent: u === 3 ? 0 : u + 1,
      });
    },
    async newTodo() {
      await this.makeRequest(`todos`, "POST", {
        title: "New Todo",
        person: this.selectedPerson ?? "WILL",
        plan: this.currentPlan._id,
      });
      this.loadTodo();
    },
    async updateTodoDeadline(id, e) {
      await this.makeRequest(`todos/${id}`, "PUT", {
        deadline: e.target.value,
      });
      this.loadTodo();
    },
    async togglePerson(id, p) {
      this.todos[this.todos.findIndex((i) => i._id === id)].person =
        p === "WILL" ? "LIK" : "WILL";
      await this.makeRequest(`todos/${id}`, "PUT", {
        person: p === "WILL" ? "LIK" : "WILL",
      });
      this.loadTodo();
    },
    selectPerson(p) {
      if (this.selectedPerson === p) {
        this.selectedPerson = "";
        return;
      }
      this.selectedPerson = p;
      Cookies.set("selectedPerson", p);
    },
    TofilterUrgent(u) {
      if (this.filterUrgent === u) {
        this.filterUrgent = null;
        return;
      }
      this.filterUrgent = u;
    },
    clearFilter() {
      this.seachKeyword = "";
      this.filterUrgent = null;
      this.filterDeadline = "";
      this.selectedPerson = "";
      this.showHiddenTodo = false;
      this.showMyDiary = false;
      this.filterCategory = 0;
      document.querySelector("#filterDeadlineInput").value = "";
    },
    showAllTodo() {
      this.showHiddenTodo = !this.showHiddenTodo;
      this.showMyDiary = false;
    },
    onTodoDrag(e, todo) {
      this.TodoDragged = { todo, screenX: e.screenX, screenY: e.screenY };
    },
    onTodoDrop(e) {
      if (this.TodoDragged.screenY - e.screenY > 200) {
        this.moveTodoToOtherPlan(this.TodoDragged.todo._id);
        return;
      }
      if (e.screenX - this.TodoDragged.screenX > 200) {
        this.stepUp(this.TodoDragged.todo._id, this.TodoDragged.todo.status);
      } else if (e.screenX - this.TodoDragged.screenX < -200) {
        this.stepDown(this.TodoDragged.todo._id, this.TodoDragged.todo.status);
      }
    },
    addTodoDescription(id) {
      this.todos[this.todos.findIndex((i) => i._id === id)].description = "";
    },
    async toggleShowDiary() {
      this.showMyDiary = !this.showMyDiary;
      if (this.showMyDiary) {
        this.loggers = await this.makeRequest("loggers");
      }
      this.isLoading = false;
    },
    handleWordStyle(word) {
      const common = "font-medium";
      let style;
      if (word === "DONE") style = "text-green-500";
      if (word === "PROGRESS") style = "text-yellow-500";
      if (word === "URGENT") style = "text-red-500";
      if (word === "HURRY") style = "text-yellow-500";
      if (word === "CREATE") style = "text-green-500";
      if (word === "NORMAL") style = "text-slate-300";

      return common + " " + style;
    },
    deleteLogger(id) {
      const confirm = window.confirm("confirm delete?");
      if (!confirm) return;
      this.makeRequest(`loggers/${id}`, "DELETE");
      this.loggers = this.loggers.filter((l) => l._id !== id);
      this.isLoading = false;
    },
    connectSocket() {
      this.socket = new WebSocket(
        this.api.includes("localhost")
          ? "ws://localhost:3002"
          : "wss://api.dse00.com:3000"
      );

      this.socket.addEventListener("open", (event) => {
        console.log("Connected to server");
      });

      this.socket.addEventListener("message", (event) => {
        console.log(event.data);
        if (["1", "2"].includes(event.data)) {
          this.socketIcon = Number(event.data) > 1 ? "👼🏻👼🏻" : "👼🏻";
          this.socketMessage =
            Number(event.data) > 1 ? "你的寶寶在線上" : "你的寶寶不在";
        }
        const randomEmoji = () => {
          const emojis = ["😘", "💋", "❤️", "🥰"];
          const random = Math.floor(Math.random() * emojis.length);
          return emojis[random];
        };
        this.open("info", "😘");
      });
    },
    socketSendHeart() {
      this.socket.send("😘");
    },
    updateTodoCat(id, category) {
      this.makeRequest(`todos/${id}`, "PUT", {
        category,
      });
      this.todos[this.todos.findIndex((i) => i._id === id)].category = category;
      this.isLoading = false;
    },
    async toMakeNewPlan() {
      const title = prompt("New Plan Name?");
      if (!title) return;
      await this.makeRequest(`plans`, "POST", {
        title,
      });
      await this.loadAllPlans();
      this.changePlan(this.allPlans[this.allPlans.length - 1]._id);
    },
    submitPlanTitle(id, e) {
      this.makeRequest(`plans/${id}`, "PUT", {
        title: e.target.value,
      });
      this.currentPlan.title = e.target.value;
      this.isLoading = false;
    },
    changePlan(id) {
      this.todos = [];
      if (this.currentPlan._id) Cookies.set("lastPlan", this.currentPlan._id);
      this.showSecretPlan = false;
      this.currentPlan = this.allPlans.find((p) => p._id === id);
      Cookies.set("currentPlan", id);
      this.clearFilter();
      this.selectedPerson = Cookies.get("selectedPerson") || "";
      this.loadTodo(id);
      if (
        !this.currentPlan?.password ||
        (this.currentPlan?.password &&
          Cookies.get(this.currentPlan.title) === this.currentPlan?.password)
      ) {
        this.showSecretPlan = true;
      }
    },
    switchPlan() {
      const id = Cookies.get("lastPlan");
      if (id == "undefined") {
        Cookies.remove("lastPlan");
        return;
      }
      this.changePlan(id);
    },
    submitPlanDescription(id, e) {
      this.makeRequest(`plans/${id}`, "PUT", {
        description: e.target.value,
      });
      this.currentPlan.description = e.target.value;
      this.isLoading = false;
    },
    async moveTodoToOtherPlan(id) {
      const planIndex = prompt("Move to? (plan ID)");
      if (!planIndex) return;

      const planId = this.allPlans[planIndex - 1]?._id;
      this.makeRequest(`todos/${id}`, "PUT", {
        plan: planId,
      });
      this.todos = this.todos.filter((t) => t._id !== id);
      this.isLoading = false;
    },
    changePlanDeadline(id, e) {
      this.makeRequest(`plans/${id}`, "PUT", {
        deadline: e.target.value,
      });
      this.currentPlan.deadline = e.target.value;
      this.isLoading = false;
    },
    setPlanPassword() {
      const password = prompt(`set Password to ${this.currentPlan.title}`);
      this.makeRequest(`plans/${this.currentPlan._id}`, "PUT", {
        password,
      });
      this.currentPlan.password = password;
      this.isLoading = false;
    },
    async exportExcel() {
      const response = await fetch(
        `${this.api}/plans/export/${this.currentPlan._id}`
      );
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${this.currentPlan.title}.xlsx`;
      link.click();
    },
  },
  computed: {
    openPlan() {
      return (
        this.currentPlan.password &&
        this.planPassword[this.currentPlan._id] !== this.currentPlan.password
      );
    },
    filteredTodos() {
      let _filteredTodo = [...this.todos];

      if (this.seachKeyword !== "") {
        _filteredTodo = _filteredTodo.filter(
          (t) =>
            t.title.toLowerCase().includes(this.seachKeyword.toLowerCase()) ||
            (t.description &&
              t.description
                .toLowerCase()
                .includes(this.seachKeyword.toLowerCase())) ||
            t.deadline.toLowerCase().includes(this.seachKeyword)
        );
      }
      if (this.selectedPerson !== "") {
        _filteredTodo = _filteredTodo.filter(
          (t) => t.person === this.selectedPerson
        );
      }
      if (this.filterUrgent !== null) {
        _filteredTodo = _filteredTodo.filter(
          (t) => t.urgent === this.filterUrgent
        );
      }
      if (this.filterDeadline !== "") {
        _filteredTodo = _filteredTodo.filter((t) => {
          const date_array = t.deadline.split("/");
          const todoDate = new Date(`2023-${date_array[1]}-${date_array[0]}`);
          const filterDate = new Date(
            `2023-${this.filterDeadline.split("/")[1]}-${
              this.filterDeadline.split("/")[0]
            }`
          );
          return filterDate >= todoDate;
        });
      }
      if (this.filterCategory > 0) {
        _filteredTodo = _filteredTodo.filter(
          (t) => t.category === this.filterCategory
        );
      }
      return _filteredTodo;
    },
    calWill() {
      const total = this.todos.filter(
        (t) => t.person === "WILL" && t.status !== -1 && t.status !== 3
      ).length;
      const done = this.todos.filter(
        (t) => t.person === "WILL" && t.status === 2
      ).length;
      const inProgress = this.todos.filter(
        (t) => t.person === "WILL" && t.status === 1
      ).length;
      const val = done + inProgress / 2;
      return val > 0 ? ((val / total) * 100).toFixed(0) : 0;
    },
    calLik() {
      const total = this.todos.filter(
        (t) => t.person === "LIK" && t.status !== -1 && t.status !== 3
      ).length;
      const done = this.todos.filter(
        (t) => t.person === "LIK" && t.status === 2
      ).length;
      const inProgress = this.todos.filter(
        (t) => t.person === "LIK" && t.status === 1
      ).length;
      const val = done + inProgress / 2;
      return val > 0 ? ((val / total) * 100).toFixed(0) : 0;
    },
  },
  watch: {},
});

todo_app.use(ElementPlus);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  todo_app.component(key, component);
}
todo_app.mount("#todo_app");

const searchWeb = () => {
  const keyword = document.querySelector("#webSearch").value;
  window.location.href = `https://movetoen.com/?s=${keyword}`;
};
