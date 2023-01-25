import type { Methods, Public$Chat, Public$Message, Public$UserStatus, Push$ChatCreated, Push$MessageCreated, Push$MessageSeen, Push$OnTyping, Push$UserStatusUpdated_DEPRECATED, Pushes } from "../types";
import type * as t from "../types";

declare namespace preact {
  interface Ref<T> {
    current?: T
  }

  interface ReactNode { }

  interface FC<T> {
    (props: T): ReactNode
  }

  class Component<P, S> {
    props: Readonly<P> & Readonly<{ children?: ReactNode | undefined }>;
    state: Readonly<S>;
    constructor(props: P, context?: any)
    setState<K extends keyof S>(state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null), callback?: () => void): void;
    componentDidMount?(): void;
    shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
    componentWillUnmount?(): void;
    componentDidCatch?(error: Error, errorInfo: { componentStack: string }): void;
    render(): ReactNode | null;
  }

  function createElement(el: any, params?: any, ...childs: any): ReactNode
  function createContext(): {
    Consumer(): ReactNode
    Provider(): ReactNode
  }
  function createRef<T>(): Ref<T>
  function render(el: ReactNode, target: HTMLElement): ReactNode
  function Fragment(): ReactNode
}

declare namespace Sentry {
  interface User {
    id: string | number
    email: string | number
    username: string | number
  }

  interface Breadcrumb {
    message: string
    category: string
    level: "fatal" | "critical" | "error" | "warning" | "log" | "info" | "debug"
  }

  interface Options {
    extra?: Record<string, string>
  }

  function forceLoad(): void
  function setUser(user: User): void
  function addBreadcrumb(options: Breadcrumb): void
  function captureException(err: Error, options: Options): void
}

declare class AccountsSDKPopup {
  authorize(): any
}

declare class AccountsSDK {
  constructor(options: any)
  popup(): AccountsSDKPopup
}

declare global {
  interface Window {
    fullscreenWidget: {
      setNotificationBadge(badge: number): void
    }
  }
}

interface IState {
  syncError: Error | null
  tokenInfo: ITokenInfo | null
  agents: Record<string, IAgent>
  chats: Record<number, Public$Chat>
  selectedAgent: {
    agentId: string
    chatId?: number
  } | null
  credentials: ICredentials | null
  userStatuses: Record<string, Public$UserStatus>
  typings: Record<number, number | void>
  timestamp: number
  notification: {
    permission: NotificationPermission | "unknown"
  }
  [key: `messages_${number}`]: UI$Message[]
  [key: `draft_${string}`]: IDraft[]
  [key: `messages_status_${number}`]: MessageStatus | void
  [key: `chat_status_${number}`]: ChatStatus | void
}

interface IAgent {
  id: string
  name: string
  avatar: string
}

interface ITokenInfo {
  entity_id: string
}

interface ICredentials {
  access_token: string
}

interface UI$Message extends Public$Message {
  notDelivered: boolean
  deliveryError: string
  date: Date
}

interface IDraft { }

type ChatStatus = "incomplete" | "up-to-date" | "loading"
type INetwork = "connecting" | "updating" | "online" | "offline"

const ControllerContext = preact.createContext()
const StoreContext = preact.createContext()
enum MessageStatus {
  Idle = "idle",
  Loading = "loading",
  ReachedTail = "reached_tail",
}
const inIframe = (function () {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})()

async function initApp(params: any) {
  const app = document.getElementById("app")
  const sound = createSoundNotifications("/direct/audio.mp3")
  const notifications = createNotifications()
  const storage = createAppStorage()
  const api = createAPI()
  const badge = createBadge()
  const store = createAppStore()
  const accountsSDK = new AccountsSDK(params)
  const controller = createController({
    api,
    store,
    sound,
    storage,
    notifications,
    onGlobalError,
  })

  maybeLoadSentry()

  loadDataFromStorage()

  // connect to ws
  if (store.getAccessToken()) {
    controller.connect()
    syncData().catch(onGlobalError).catch(console.error)
  }

  window.addEventListener("dblclick", function () {
    console.info("state", store.getState())
  })

  store.subscribe(function () {
    badge.setBadge(getUnseenChatsCount(store))
  })

  document.body.classList.toggle("embeded-in-aa", isFullScreenWidgetEnabled())

  if (!app) {
    throw new RangeError("`app` can't be empty")
  }

  preact.render(
    preact.createElement(ControllerContext.Provider, { value: controller },
      preact.createElement(StoreContext.Provider, { value: store },
        preact.createElement(AppContainer, {
          authorize: authorize,
          onSelectAgent: onSelectAgent,
          onWarmAgent: onWarmAgent,
          onInputDraft: onInputDraft,
          onSendMessage: onSendMessage,
          onHoverMessages: onHoverMessages,
          askNotificationPermission: askNotificationPermission,
          skipNotificationPermission: skipNotificationPermission,
        })
      )
    ),
    app
  )

  return {
    // TBD
  }

  function onSelectAgent(agent: IAgent) {
    return controller.setSelectedAgentId(agent.id)
  }

  function onWarmAgent(_: any, chatId: number) {
    if (chatId) {
      return controller.syncMessages(chatId)
        .catch(onGlobalError)
        .catch(console.error)
    }
  }

  function onInputDraft(agentId: string, text: string, chatId: number) {
    return controller.setDraft(agentId, text, chatId)
      .catch(onGlobalError)
      .catch(console.error)
  }

  function onSendMessage() {
    return controller.sendMessage()
      .catch(onGlobalError)
      .catch(console.error)
  }

  function onHoverMessages(chat: Public$Chat) {
    if (chat) {
      controller.readChatMessages(chat.id)
        .catch(onGlobalError)
        .catch(console.error)
    }
  }

  function askNotificationPermission() {
    notifications.requestPermission()
      .catch(function (err) {
        alert(err.message)
      })
      .finally(function () {
        store.nest("notification", {
          permission: Notification.permission
        })
      })
  }

  function skipNotificationPermission() {
    store.nest("notification", {
      permission: "denied"
    })
  }

  function syncData() {
    return Promise.all([
      controller.syncMe(),
      controller.syncAgents()
    ])
  }

  function authorize() {
    return accountsSDK.popup().authorize()
      .then(setCredentials)
      .then(syncData)
      .then(controller.connect)
      .catch(console.error)
  }

  function loadDataFromStorage() {
    store.setCredentials(storage.getCredentials())
    store.setAgents(storage.getAgents() || {})
    store.setChats(storage.getChats() || {})
    store.setTokenInfo(storage.getTokenInfo())
  }

  function setCredentials(credentials: ICredentials) {
    store.setCredentials(credentials)
    storage.setCredentials(credentials)
  }

  function clear() {
    store.setTokenInfo(null)
    store.setCredentials(null)
    storage.clear()
  }

  function onGlobalError(err: any) {
    if (err.type === "authentication") {
      return clear()
    }

    if (err.type === "authorization") {
      return clear()
    }

    throw err
  }
}

function App(props: Pick<IState, "syncError" | "credentials" | "tokenInfo" | "notification">) {
  const h = preact.createElement

  if (props.syncError) {
    return h(ErrorScreen, props)
  }

  if (!props.credentials || !props.tokenInfo) {
    return h(LoginScreen, props)
  }

  // in IFrame Web Notification does not work well
  if (!inIframe && props.notification.permission === "default") {
    return h(AskNotificationPermissionScreen, props)
  }

  return h("div", { className: "main" },
    h("div", { className: "grid" },
      h("div", { className: "grid-right" }, GridRigth(props)),
      h("div", { className: "grid-main" }, GridMain(props))
    )
  )
}
const AppContainer = connectToStore(App, function (state) {
  return state
  // return {
  //   syncError: state.syncError,
  //   credentials: state.credentials,
  //   tokenInfo: state.tokenInfo,
  //   notification: state.notification,
  // }
})

function GridRigth(props: any) {
  const h = preact.createElement
  const dialogs = getDialogs(props)

  return h("div", { className: "sidebar" },
    h("div", { className: "sidebar-head" },
      h("div", { className: "header" },
        h("img", { className: "header-logo", src: "/direct/icon.png", height: 32, width: 32 }),
        h("div", { className: "header-brand" }, "Direct"),
        h("div", { className: "header-alpha" }, String.fromCharCode(945, 108, 112, 104, 97))
      )
    ),
    h("div", { className: "sidebar-body" },
      dialogs.map(function (dialog) {
        return AgentListItem(dialog, props)
      })
    )
  )
}

function GridMain(props: any) {
  const h = preact.createElement
  const f = preact.Fragment
  let agentId: string | null = null
  let chatId: number | null = null
  let draft = ""

  if (props.selectedAgent) {
    agentId = props.selectedAgent.agentId
    chatId = props.selectedAgent.chatId
  }

  if (agentId) {
    draft = props[`draft_${agentId}`] || ""
  }

  return h("div", { className: "feed" },
    agentId ? Feed() : FeedPlaceholder()
  )

  function Feed() {
    return h(f, {},
      h("div", { className: "feed-header" }, ChatHeader(props)),
      h("div", { className: "feed-messages" }, renderMessages(props)),
      h("div", { className: "feed-footer" }, h(Composer, {
        draft: draft,
        onInputDraft: onInputDraft,
        onSendMessage: props.onSendMessage,
      }))
    )
  }

  function FeedPlaceholder() {
    return h("div", { className: "feed-placeholder" },
      h("div", { className: "text-secondary" }, "Select agent to start chatting")
    )
  }

  function onInputDraft(text: string) {
    if (typeof props.onInputDraft === "function") {
      props.onInputDraft(agentId, text, chatId)
    }
  }
}

function AgentListItem(dialog: any, props: any) {
  const h = preact.createElement
  const myId = props.tokenInfo.entity_id
  const agent = dialog.agent
  const chat = dialog.chat
  const status = props.userStatuses[agent.id]
  const isOnline = status && status.status === "online"
  let unseenMessagesCount = 0
  let className = "agent-list-item"
  let lastMessage = agent.id

  if (props.selectedAgent && props.selectedAgent.agentId === agent.id) {
    className += " agent-list-item-selected"
  }

  if (chat) {
    if (chat.last_message_text) {
      lastMessage = chat.last_message_text
    }

    const messages = props[`messages_${chat.id}`]

    if (Array.isArray(messages)) {
      unseenMessagesCount = getUnseenMessagesCount(chat, messages, myId)

      if (unseenMessagesCount > 0) {
        className += " agent-list-item-has-unseen-messages"
      }
    }

    if (typeof props.typings[chat.id] === "number" && props.typings[chat.id] + 15000 > Date.now()) {
      lastMessage = h(Typing)
    }
  }

  return h("div", { className: className, key: agent.id, onClick: () => props.onSelectAgent(agent) },
    h("div", { className: "agent-list-avatar" }, renderAvatar(36, agent.avatar, isOnline)),
    h("div", { className: "agent-list-identity" },
      h("div", { className: "text-primary" }, agent.name),
      h("div", { className: "text-secondary text-truncate" }, lastMessage)
    ),
    h("div", { className: "agent-list-badge" }, unseenMessagesCount)
  )
}

function ChatHeader(props: any) {
  const h = preact.createElement

  if (!props.selectedAgent) {
    return null
  }

  const agent = props.agents[props.selectedAgent.agentId]

  if (!agent) {
    return null
  }

  const network = props.network

  if (network !== "online") {
    return h("div", { className: "chat-header" },
      h("div", { className: "loader" }),
      h("div", { className: "text-primary ml-3" }, formatNetworkStatus(network)),
    )
  }

  const status = props.userStatuses[agent.id]
  let isOnline = false
  let statusText = agent.id

  if (status) {
    isOnline = status.status === "online"
    statusText = formatUserStatus(status)
  }

  return h("div", { className: "chat-header" },
    renderAvatar(40, agent.avatar, isOnline),
    h("div", { className: "chat-header-identity" },
      h("div", { className: "text-primary" }, agent.name),
      h("div", { className: "text-secondary" }, statusText)
    )
  )

  function formatNetworkStatus(network: INetwork) {
    switch (network) {
      case "offline":
      case "connecting":
        return "Waiting for network..."
      case "updating":
        return "Updating..."
      default:
        return network
    }
  }
}

function renderAvatar(size: number, avatarUrl: string, isOnline: boolean) {
  const h = preact.createElement
  let className = "avatar"

  if (isOnline) {
    className += " avatar-online"
  }

  return h("div", { className: className },
    h("div", { className: "avatar-clip" },
      h("img", {
        className: "avatar-img",
        src: avatarUrl,
        width: size,
        height: size
      })
    ),
    h("div", { className: "avatar-badge" })
  )
}

function renderMessages(props: any) {
  const h = preact.createElement
  const chatId = props.selectedAgent && props.selectedAgent.chatId
  const myId = props.tokenInfo.entity_id
  const chatStatus: ChatStatus = chatId && props[`chat_status_${chatId}`]
  const messages: UI$Message[] = chatId && props[`messages_${chatId}`] || []
  const chat = chatId ? props.chats[chatId] : null

  if (messages.length === 0 || !chat) {
    return renderPlaceholder()
  }

  if (chatStatus === "loading") {
    return renderLoader()
  }

  return h(MessagesListContainer, {
    myId: myId,
    chat: chat,
    messages: messages,
    agents: props.agents,
    onMoveMessages: onMoveMessages,
    onHoverMessages: onHoverMessages,
  })

  function renderPlaceholder() {
    return h("div", { className: "messages-placeholder" },
      h("div", { className: "text-secondary" }, "No messages here yet"),
    )
  }

  function renderLoader() {
    return h("div", { className: "messages-placeholder" },
      h("div", { className: "loader" })
    )
  }

  function onMoveMessages() {
    if (typeof props.onMoveMessages === "function") {
      props.onMoveMessages(chat)
    }
  }

  function onHoverMessages() {
    if (typeof props.onHoverMessages === "function") {
      props.onHoverMessages(chat)
    }
  }
}

interface MessagesListProps {
  agents: IState["agents"]
  messages: UI$Message[]
  myId: string
  chat: Public$Chat
  onTopReached(): void
  setReverseScroll(r: IReverseScroll | null): void
  onMoveMessages(): void
  onHoverMessages(): void
}

class MessagesList extends preact.Component<MessagesListProps, {}> {
  scrollElRef: preact.Ref<HTMLElement>
  contentContainerElRef: preact.Ref<HTMLElement>
  reverseScroll: IReverseScroll | null

  constructor(props: MessagesListProps, context: any) {
    super(props, context)

    this.scrollElRef = preact.createRef()
    this.contentContainerElRef = preact.createRef()
    this.reverseScroll = null
    this.onTopReached = this.onTopReached.bind(this)
  }

  componentDidMount() {
    const scrollEl = this.scrollElRef.current
    const contentContainerEl = this.contentContainerElRef.current

    if (scrollEl && contentContainerEl) {
      this.reverseScroll = createReverseScroll({
        scrollEl,
        contentContainerEl,
        onTopReached: this.onTopReached,
        onTopReachedThreshold: 0.1,
      })
      this.props.setReverseScroll(this.reverseScroll)
    }
  }

  componentWillUnmount() {
    if (this.reverseScroll) {
      this.reverseScroll.dispose()
    }
    this.props.setReverseScroll(null)
  }

  onTopReached() {
    if (typeof this.props.onTopReached === "function") {
      this.props.onTopReached()
    }
  }

  render() {
    const h = preact.createElement
    const groups: preact.ReactNode[] = []
    let currGroup: preact.ReactNode[] = []
    let prevMessage: UI$Message
    let currMessage: UI$Message
    let nextMessage: UI$Message

    if (this.props.messages.length === 0) {
      return null
    }

    groups.push(
      h("div", {
        className: "messages-group",
        key: dateTime.tsToDays(this.props.messages[0].ts)
      }, currGroup)
    )

    for (let i = 0; i < this.props.messages.length; i++) {
      prevMessage = this.props.messages[i - 1]
      currMessage = this.props.messages[i]
      nextMessage = this.props.messages[i + 1]

      // top of the list
      if (!prevMessage && currMessage) {
        currGroup.push(h(MessageDay, {
          key: currMessage.ts,
          date: currMessage.date,
        }))
      }

      // on the day change
      if (prevMessage && currMessage && !dateTime.isSameDate(prevMessage.date, currMessage.date)) {
        currGroup = [
          h(MessageDay, {
            key: currMessage.ts,
            date: currMessage.date,
          })
        ]

        groups.push(
          h("div", {
            className: "messages-group",
            key: dateTime.tsToDays(currMessage.ts)
          }, currGroup)
        )
      }

      currGroup.push(h(Message, {
        key: currMessage.id,
        myId: this.props.myId,
        chat: this.props.chat,
        agents: this.props.agents,
        message: currMessage,
      }))
    }

    return h("div", {
      className: "messages-list",
      ref: this.scrollElRef,
      onMouseMove: this.props.onMoveMessages,
      onMouseOver: this.props.onHoverMessages,
    },
      h("div", {
        className: "messages-container",
        ref: this.contentContainerElRef
      }, groups)
    )
  }
}

function MessagesListContainer(props: any) {
  const h = preact.createElement

  function render(controller: IController) {
    return h(MessagesList, Object.assign({}, props, {
      controller,
      onTopReached,
      setReverseScroll,
    }))

    function onTopReached() {
      const chatId = props.chat && props.chat.id

      if (chatId) {
        controller.loadMoreMessages(chatId)
      }
    }

    function setReverseScroll(reverseScroll: IReverseScroll | null) {
      controller.setReverseScroll(reverseScroll)
    }
  }

  return h(ControllerContext.Consumer, {}, render)
}

function Message(props: {
  myId: string
  chat: Public$Chat
  message: UI$Message
  agents: IState["agents"]

}) {
  const h = preact.createElement
  const myId = props.myId
  const chat = props.chat
  const message = props.message
  const agents = props.agents
  const author = agents[message.author_id]
  const avatar = author && author.avatar
  let className = "message"
  let seenTillMessageId = 0

  if (chat.user_a_id === myId) {
    seenTillMessageId = chat.seen_till_message_id_b
  }
  else {
    seenTillMessageId = chat.seen_till_message_id_a
  }

  if (message.author_id === myId) {
    if (message.notDelivered) {
      className += " message-loading"
    }
    else if (message.id <= seenTillMessageId) {
      className += " message-seen"
    }
    else {
      className += " message-sent"
    }
  }

  return h("div", { className: className },
    h("div", { className: "message-avatar" }, renderAvatar(32, avatar, false)),
    h("div", { className: "message-body" },
      h("div", { className: "text-secondary text-break-all" }, author && author.name),
      h("div", { className: "text-dark text-pre-line text-break-all" }, message.text),
    ),
    h("div", { className: "message-additional" },
      h("div", { className: "message-icon message-icon-loading" },
        h(ScheduleIcon, { size: 14 }),
      ),
      h("div", { className: "message-icon message-icon-sent" },
        h(DoneIcon, { size: 14 }),
      ),
      h("div", { className: "message-icon message-icon-seen" },
        h(DoneAllIcon, { size: 14 }),
      ),
      h("div", { className: "text-secondary" }, dateTime.formatTime(message.date)),
    )
  )
}

interface MessageDayProps {
  date: Date
}

class MessageDay extends preact.Component<MessageDayProps, any> {
  text: string

  constructor(props: MessageDayProps) {
    super(props)

    this.text = dateTime.isSameDate(props.date, new Date())
      ? "Today"
      : dateTime.toLocalDate(props.date)
  }

  render() {
    const h = preact.createElement

    return h("div", { className: "message-day" },
      h("div", { className: "message-day-text" }, this.text)
    )
  }
}

class Composer extends preact.Component<any, any> {
  isFocused: boolean
  wasFocused: boolean
  autoResizer: IAutoResizer | null
  inputEl: preact.Ref<HTMLInputElement>

  constructor(props: any, ctx: any) {
    super(props, ctx)

    this.isFocused = false
    this.wasFocused = false
    this.autoResizer = null
    this.inputEl = preact.createRef()
    this.onInputDraft = this.onInputDraft.bind(this)
    this.onInputFocus = this.onInputFocus.bind(this)
    this.onInputBlur = this.onInputBlur.bind(this)
    this.onInputKeyDown = this.onInputKeyDown.bind(this)
    this.onSendMouseDown = this.onSendMouseDown.bind(this)
    this.onSendClick = this.onSendClick.bind(this)
  }

  componentDidMount() {
    const inputEl = this.inputEl.current

    if (inputEl) {
      this.autoResizer = createAutoResizer(inputEl)
      inputEl.focus()
    }
  }

  componentWillUnmount() {
    if (this.autoResizer) {
      this.autoResizer.dispose()
    }
  }

  render() {
    const h = preact.createElement
    let className = "composer"

    if (this.props.draft.length > 0) {
      className += " composer-send-enabled"
    }

    return h("div", { className: className },
      h("label", { className: "composer-label", for: "composer-input" },
        h("textarea", {
          ref: this.inputEl,
          id: "composer-input",
          className: "composer-input",
          autocomplete: "off",
          autocorrect: "on",
          spellcheck: true,
          autofocus: true,
          placeholder: "Write a message...",
          rows: 1,
          value: this.props.draft,
          onInput: this.onInputDraft,
          onFocus: this.onInputFocus,
          onBlur: this.onInputBlur,
          onKeyDown: this.onInputKeyDown,
        })
      ),
      h("button", {
        className: "composer-send",
        onMouseDown: this.onSendMouseDown,
        onClick: this.onSendClick,
      }, h(SendIcon, { size: 24 }))
    )
  }

  onInputDraft(event: any) {
    if (typeof this.props.onInputDraft === "function") {
      this.props.onInputDraft(event.target.value)
    }
  }

  onInputFocus() {
    this.isFocused = true
  }

  onInputBlur() {
    this.isFocused = false
  }

  onInputKeyDown(event: KeyboardEvent) {
    if (event.shiftKey === false && event.key === "Enter") {
      this.props.onSendMessage()
      event.preventDefault()
    }
  }

  onSendMouseDown() {
    this.wasFocused = this.isFocused
  }

  onSendClick() {
    this.props.onSendMessage()

    if (this.wasFocused && this.inputEl.current) {
      this.inputEl.current.focus()
    }
  }
}

function Typing() {
  const h = preact.createElement
  const f = preact.Fragment

  return h("span", { className: "typing" },
    h("span", { className: "typing-text" }, "typing"),
    h("span", { className: "typing-dot" }, "."),
    h("span", { className: "typing-dot" }, "."),
    h("span", { className: "typing-dot" }, ".")
  )
}

function ErrorScreen(props: {
  syncError: Error
}) {
  const h = preact.createElement

  return (
    h("div", { className: "container p-3" }, [
      h("div", { className: "alert alert-warning" }, [
        h("strong", { textContent: props.syncError.message }),
        h("details", { className: "py-2" }, [
          h("summary", { textContent: "Details" }),
          h("code", { textContent: props.syncError.stack })
        ]),
        h("button", { className: "btn-primary", textContent: "Refresh", onClick: coldReload })
      ])
    ])
  )
}

class LoginScreen extends preact.Component<{
  authorize(): Promise<void>
}, {
  isAuthorizing?: boolean
}> {
  constructor(props: any, context: any) {
    super(props, context)
    this.authorize = this.authorize.bind(this)
  }

  authorize() {
    if (typeof this.props.authorize !== "function") {
      throw new RangeError("`this.props.authorize` has to be a function")
    }

    this.setState({
      isAuthorizing: true
    })

    Promise.resolve(this.props.authorize()).finally(() => {
      this.setState({
        isAuthorizing: false
      })
    })
  }

  render() {
    const h = preact.createElement

    return h("div", { className: "main" },
      h("div", { className: "sticky-center text-center" },
        h("img", { src: "/direct/icon.png", height: 64, width: 64 }),
        h("h1", { className: "m-0 mb-3" }, "Welcome to Direct"),
        h("button", {
          className: "btn-primary",
          onClick: this.props.authorize,
          disabled: this.state.isAuthorizing,
        }, "Continue with LiveChat")
      )
    )
  }
}

class AskNotificationPermissionScreen extends preact.Component<{
  skipNotificationPermission(): void
  askNotificationPermission(): void
}, {}> {
  constructor(props: any, context: any) {
    super(props, context)
  }

  render() {
    const h = preact.createElement

    return h("div", { className: "main" },
      h("div", { className: "sticky-center text-center" },
        h(NotificationIcon, { size: 64 }),
        h("h1", { className: "m-0 mb-3" }, "Enable notifications"),
        h("p", { className: "m-0 mb-3" }, "Don't miss a message"),
        h("button", {
          className: "btn-secondary",
          onClick: this.props.skipNotificationPermission,
        }, "Skip"),
        h("button", {
          className: "btn-primary ml-3",
          onClick: this.props.askNotificationPermission,
        }, "Enable")
      )
    )
  }
}

function SendIcon(props: {
  size: number
}) {
  const h = preact.createElement
  const size = props.size || 24

  return (
    h("svg", { width: size, height: size, viewBox: "0 0 512 512", fill: "currentColor" },
      h("path", { d: "M476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0027.14 52 24.65 24.65 0 0016 72.59v113.29a24 24 0 0019.52 23.57l232.93 43.07a4 4 0 010 7.86L35.53 303.45A24 24 0 0016 327v113.31A23.57 23.57 0 0026.59 460a23.94 23.94 0 0013.22 4 24.55 24.55 0 009.52-1.93L476.4 285.94l.19-.09a32 32 0 000-58.8z" })
    )
  )
}

function ScheduleIcon(props: {
  size: number
}) {
  const h = preact.createElement
  const size = props.size || 24

  return (
    h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
      h("path", { d: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13h-.06c-.4 0-.72.32-.72.72v4.72c0 .35.18.68.49.86l4.15 2.49c.34.2.78.1.98-.24.21-.34.1-.79-.25-.99l-3.87-2.3V7.72c0-.4-.32-.72-.72-.72z" })
    )
  )
}

function DoneIcon(props: {
  size: number
}) {
  const h = preact.createElement
  const size = props.size || 24

  return (
    h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
      h("path", { d: "M9 16.2l-3.5-3.5c-.39-.39-1.01-.39-1.4 0-.39.39-.39 1.01 0 1.4l4.19 4.19c.39.39 1.02.39 1.41 0L20.3 7.7c.39-.39.39-1.01 0-1.4-.39-.39-1.01-.39-1.4 0L9 16.2z" })
    )
  )
}

function DoneAllIcon(props: {
  size: number
}) {
  const h = preact.createElement
  const size = props.size || 24

  return (
    h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" },
      h("path", { d: "M17.3 6.3c-.39-.39-1.02-.39-1.41 0l-5.64 5.64 1.41 1.41L17.3 7.7c.38-.38.38-1.02 0-1.4zm4.24-.01l-9.88 9.88-3.48-3.47c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L22.95 7.71c.39-.39.39-1.02 0-1.41h-.01c-.38-.4-1.01-.4-1.4-.01zM1.12 14.12L5.3 18.3c.39.39 1.02.39 1.41 0l.7-.7-4.88-4.9c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.03 0 1.42z" })
    )
  )
}

function NotificationIcon(props: {
  size: number
}) {
  const h = preact.createElement
  const size = props.size || 24

  return (
    h("svg", { width: size, height: size, viewBox: "0 0 48 48", fill: "currentColor" },
      h("path", { d: "M8 38V35H12.2V19.7Q12.2 15.6 14.675 12.275Q17.15 8.95 21.2 8.1V6.65Q21.2 5.5 22.025 4.75Q22.85 4 24 4Q25.15 4 25.975 4.75Q26.8 5.5 26.8 6.65V8.1Q30.85 8.95 33.35 12.275Q35.85 15.6 35.85 19.7V35H40V38ZM24 23.25Q24 23.25 24 23.25Q24 23.25 24 23.25Q24 23.25 24 23.25Q24 23.25 24 23.25ZM24 44Q22.4 44 21.2 42.825Q20 41.65 20 40H28Q28 41.65 26.825 42.825Q25.65 44 24 44ZM15.2 35H32.85V19.7Q32.85 15.95 30.325 13.375Q27.8 10.8 24.05 10.8Q20.35 10.8 17.775 13.375Q15.2 15.95 15.2 19.7Z" })
    )
  )
}

function coldReload() {
  location.replace(location.protocol + '//' + location.host + location.pathname)
}

type IAppStore = ReturnType<typeof createAppStore>

function createAppStore() {
  const NO_MESSAGES: UI$Message[] = []
  const store = createStore<IState>({
    syncError: null,
    tokenInfo: null,
    credentials: null,
    agents: {},
    chats: {},
    userStatuses: {},
    selectedAgent: null,
    timestamp: 0,
    typings: {},
    notification: {
      permission: window.Notification ? window.Notification.permission : "unknown"
    }
  })

  return Object.assign(store, {
    getMyId,
    setTokenInfo,
    setCredentials,
    setAgents,
    setChats,
    getChats,
    setChat,
    getChat,
    updateChat,
    updateSeenTillMessageId,
    setChatStatuses,
    getChatStatus,
    setChatStatus,
    setNetwork,
    setUserStatuses,
    setUserStatus,
    getMessagesStatus,
    setMessagesStatus,
    getAccessToken,
    setSelectedAgentId,
    getSelectedAgentId,
    getMessages,
    setMessages,
    appendMessages,
    prependMessages,
    updateMessage,
    setDraft,
    setTimestamp,
    setTyping,
  })

  function getMyId() {
    return store.getState().tokenInfo?.entity_id
  }

  function setTokenInfo(tokenInfo: ITokenInfo | null) {
    store.dispatch({ tokenInfo })
  }

  function setCredentials(credentials: ICredentials | null) {
    store.dispatch({ credentials })
  }

  function setAgents(agents: IState["agents"]) {
    store.dispatch({ agents })
  }

  function getChats() {
    return store.getState().chats
  }

  function setChats(chats: IState["chats"]) {
    store.dispatch({ chats })
  }

  function setChat(chat: Public$Chat) {
    const state = store.getState()
    const chats = Object.assign({}, state.chats, {
      [chat.id]: chat
    })

    store.dispatch({ chats })
  }

  function getChat(chatId: number) {
    return store.getState().chats[chatId]
  }

  function updateChat(chatId: number, chatPartial: Partial<Public$Chat>) {
    const state = store.getState()
    const prevChat = state.chats[chatId]

    if (!prevChat) {
      return
    }

    const nextChat = Object.assign({}, prevChat, chatPartial)
    const chats = Object.assign({}, state.chats, {
      [chatId]: nextChat
    })

    store.dispatch({ chats })
  }

  function updateSeenTillMessageId(chatId: number, userId: string, messageId: number) {
    const state = store.getState()

    if (!state.chats[chatId]) {
      return
    }

    const chat = {
      ...state.chats[chatId],
    }

    if (chat.user_a_id === userId && chat.seen_till_message_id_a < messageId) {
      chat.seen_till_message_id_a = messageId
    }
    else if (chat.user_b_id === userId && chat.seen_till_message_id_b < messageId) {
      chat.seen_till_message_id_b = messageId
    }

    store.dispatch({
      chats: {
        ...state.chats,
        [chatId]: chat
      }
    })
  }

  function setChatStatuses(chatStatuses: Map<number, ChatStatus>) {
    const next: {
      [key: `chat_status_${number}`]: ChatStatus | void
    } = {}

    for (const [chatId, chatStatus] of chatStatuses) {
      next[`chat_status_${chatId}`] = chatStatus
    }

    store.dispatch(next)
  }

  function getChatStatus(chatId: number): ChatStatus {
    const chatStatus = store.getState()[`chat_status_${chatId}`]

    if (!chatStatus) {
      return "incomplete"
    }

    return chatStatus
  }

  function setChatStatus(chatId: number, chatStatus: ChatStatus) {
    store.dispatch({
      [`chat_status_${chatId}`]: chatStatus
    })
  }

  function setNetwork(network: INetwork) {
    store.dispatch({ network })
  }

  function setUserStatuses(userStatuses: IState["userStatuses"]) {
    store.dispatch({ userStatuses })
  }

  function setUserStatus(userStatus: Public$UserStatus) {
    const state = store.getState()
    const userStatuses = Object.assign({}, state.userStatuses, {
      [userStatus.user_id]: userStatus
    })

    store.dispatch({ userStatuses })
  }

  function getMessagesStatus(chatId: number) {
    return store.getState()[`messages_status_${chatId}`]
  }

  function setMessagesStatus(chatId: number, status: MessageStatus) {
    store.dispatch({
      [`messages_status_${chatId}`]: status
    })
  }

  function getAccessToken() {
    const state = store.getState()

    if (state && state.credentials && state.credentials.access_token) {
      return state.credentials.access_token
    }

    return ""
  }

  function setSelectedAgentId(agentId: string, chatId: number | null) {
    store.dispatch({
      selectedAgent: {
        agentId: agentId,
        chatId: chatId,
      }
    })
  }

  function getSelectedAgentId() {
    const state = store.getState()

    if (state.selectedAgent) {
      return state.selectedAgent.agentId
    }
  }

  function getMessages(chatId: number) {
    return store.getState()[`messages_${chatId}`] || NO_MESSAGES
  }

  function setMessages(chatId: number, messages: UI$Message[]) {
    store.dispatch({
      [`messages_${chatId}`]: messages,
    })
  }

  function appendMessages(chatId: number, messages: UI$Message[]) {
    setMessages(chatId, concatMessages(getMessages(chatId), messages))
  }

  function prependMessages(chatId: number, messages: UI$Message[]) {
    setMessages(chatId, concatMessages(messages, getMessages(chatId)))
  }

  function updateMessage(chatId: number, messageId: number, incomingMessage: Partial<UI$Message>) {
    const nextMessages = getMessages(chatId).map(function (message) {
      if (message.id === messageId) {
        return Object.assign({}, message, incomingMessage)
      }

      return message
    })

    store.dispatch({
      [`messages_${chatId}`]: nextMessages
    })
  }

  function setDraft(agentId: string, text: string) {
    store.dispatch({
      [`draft_${agentId}`]: text
    })
  }

  function setTimestamp(timestamp: number) {
    store.dispatch({ timestamp })
  }

  function setTyping(chatId: number, isTyping: boolean) {
    const partial: Record<number, number | void> = {
      [chatId]: void 0
    }

    if (isTyping) {
      partial[chatId] = Date.now()
    }

    store.nest("typings", partial)
  }
}

function connectToStore<T>(
  Component: preact.Component<any, any> | preact.FC<any>,
  mapStateToProps: (state: IState) => T
) {
  class ConnectedComponent extends preact.Component<{
    store: IAppStore
    originProps: any
  }, T> {
    constructor(props: any) {
      super(props)

      this.state = mapStateToProps(props.store.getState())
      this.unsubscribe = props.store.subscribe(() => {
        this.setState(mapStateToProps(props.store.getState()))
      })
    }

    unsubscribe() { }

    shouldComponentUpdate(nextProps: any, nextState: any) {
      return !shallowEqual(this.state, nextState)
    }

    componentWillUnmount() {
      this.unsubscribe()
    }

    render() {
      return preact.createElement(Component, {
        ...this.props.originProps,
        ...this.state
      })
    }
  }

  return function WrapperComponent(props: any) {
    return preact.createElement(StoreContext.Consumer, null, function (store: IAppStore) {
      return preact.createElement(ConnectedComponent, {
        originProps: props,
        store: store
      })
    })
  }
}

function createStore<T>(initialState: T) {
  const subscribers = new Set<Function>()
  let state = initialState

  return {
    getState,
    subscribe,
    dispatch,
    nest,
    maybeNest,
  }

  function getState() {
    return state
  }

  function dispatch(partial: Partial<T> | any) {
    state = {
      ...state,
      ...partial
    }
    subscribers.forEach(function (subscriber) {
      subscriber()
    })
  }

  function subscribe(subscriber: Function) {
    subscribers.add(subscriber)

    return function () {
      subscribers.delete(subscriber)
    }
  }

  function nest<K extends keyof T>(key: K, partial: Partial<T[K]>) {
    return dispatch({
      [key]: Object.assign({}, state[key], partial)
    })
  }

  function maybeNest<K extends keyof T>(key: K, partial: Partial<T[K]>) {
    if (state[key]) {
      return dispatch({
        [key]: Object.assign({}, state[key], partial)
      })
    }
  }
}

function isEqual(x: any, y: any) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y
  } else {
    return x !== x && y !== y
  }
}

function shallowEqual(objA: any, objB: any) {
  if (isEqual(objA, objB)) {
    return true
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !isEqual(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false
    }
  }

  return true
}

type IAPI = ReturnType<typeof createAPI>

function createAPI() {
  return {
    listAgents(accessToken: string) {
      return fetch("https://api.livechatinc.com/v3.4/configuration/action/list_agents", {
        headers: getRequestHeaders(accessToken),
        method: "POST",
        body: JSON.stringify({})
      }).then(parseResponse).then(parseAgents)
    },
    getToken(accessToken: string) {
      return fetch("direct/get_token", {
        headers: getRequestHeaders(accessToken),
        method: "POST",
        body: JSON.stringify({})
      }).then(parseResponse)
    },
  }

  function getRequestHeaders(accessToken: string) {
    return {
      "X-Region": getRegion(accessToken),
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
  }

  function getRegion(accessToken: string) {
    return String(accessToken).split(":")[0]
  }

  function parseResponse(response: Response) {
    if (response.ok) {
      return response.json()
    }

    // error
    return response.text().then(function (text) {
      try {
        const data = JSON.parse(text)
        const message = data.error && data.error.message ? data.error.message : data.error
        const type = data.error && data.error.type || data.type || "internal_error"

        return Promise.reject(new ErrorWithType(message, type, response.status))
      }
      catch (err) {
        throw new Error(text)
      }
    })
  }

  function parseAgents(agents: any) {
    return Array.isArray(agents) ? agents.map(parseAgent) : []
  }

  function parseAgent(agent: any): IAgent {
    return {
      id: String(agent.id),
      name: String(agent.name),
      avatar: parseAvatarUrl(agent.avatar)
    }
  }

  function parseAvatarUrl(avatarUrl: string) {
    if (typeof avatarUrl === "string") {
      return parseUrl(avatarUrl)
    }

    return ""
  }

  function parseUrl(url: string) {
    if (url.startsWith("http://")) {
      return url.replace("http://", "https://");
    }

    if (!url.startsWith("http")) {
      return "https://" + url;
    }

    return url
  }
}

function fetchTokenInfo(accessToken: string) {
  return fetch(`https://accounts.livechat.com/info?code=${accessToken}`).then(function (response) {
    return response.json().then(function (json) {
      if (response.ok) {
        return json
      }

      const message = json.result || json.error_description || JSON.stringify(json)

      throw new ErrorWithType(message, "authorization", response.status)
    })
  })
}

function withController<P, S>(Component: preact.Component<P, S>) {
  const h = preact.createElement
  return function (props: P) {
    return h(ControllerContext.Consumer, {}, function (controller: IController) {
      return h(Component, { ...props, controller })
    })
  }
}

type IController = ReturnType<typeof createController>

function createController(params: {
  api: IAPI
  store: IAppStore
  storage: IAppStorage
  sound: ISoundNotifications
  notifications: INotifications
  onGlobalError(err: any): void
}) {
  const { api, store, storage, sound, notifications, onGlobalError } = params
  const debouncedSetTyping = debounce(setTyping, 1000)
  let currReverseScroll: IReverseScroll | null = null
  let timeout: any = null
  let ws: IWebSocket | null = null
  let abortController = new AbortController()

  return {
    connect,
    syncMe,
    syncAgents,
    sendMessage,
    readChatMessages,
    setSelectedAgentId,
    syncMessages,
    setDraft,
    loadMoreMessages,
    setReverseScroll,
  }

  async function connect() {
    const accessToken = store.getAccessToken()
    let token = ""

    if (!accessToken) {
      return
    }

    store.setNetwork("connecting")

    await api.getToken(accessToken).then(function (data) {
      token = data.token
      store.setTokenInfo(data.info)
    }).catch(onGlobalError).catch(function (err) {
      console.warn(err)
    })

    ws = createWebSocket(new URLSearchParams({ token: token }))
    ws.onOpen = onOpen
    ws.onPush = onPush
    ws.onClose = onClose
    ws.onError = onError
  }

  async function onOpen() {
    abortController = new AbortController()

    store.setNetwork("updating")

    updateStore(abortController)
      .catch(maybeCaptureException)
      .finally(function () {
        store.setNetwork("online")
      })
  }

  async function updateStore(abortController: AbortController) {
    let state = store.getState()
    let ts = state.timestamp
    let offset_id = 0
    let limit = 20
    let mergedChats

    // optional for now
    await signIn({
      access_token: store.getAccessToken()
    }).catch(maybeCaptureException)

    if (abortController.signal.aborted) {
      return
    }

    // update user's statuses
    const [err, userStatuses] = await go(getUserStatuses({}))

    if (!err && userStatuses) {
      store.setUserStatuses(indexBy(userStatuses, "user_id"))
    }

    // update chats
    while (true) {
      if (abortController.signal.aborted) {
        return
      }

      const [err, chats] = await go(getChats({
        ts,
        limit,
        offset_id
      }))

      if (err || !chats) {
        console.warn("fail to sync chats", err)
        break
      }

      if (chats.length === 0) {
        break
      }

      state = store.getState()
      mergedChats = mergeChats(state.chats, chats)
      store.setChats(mergedChats)
      storage.setChats(mergedChats)

      for (const chat of chats) {
        const chatStatus = store.getChatStatus(chat.id)

        if (chatStatus !== "incomplete") {
          continue
        }

        await syncMessages(chat.id).catch(maybeCaptureException)
      }

      offset_id = chats[chats.length - 1].id
    }

    store.setTimestamp(getTimestamp())
  }


  function onPush(push: Pushes) {
    switch (push.push) {
      case "chatCreated":
        return onChatCreated(push)
      case "messageCreated":
        return onMessageCreated(push)
      case "messageSeen":
        return onMessageSeen(push)
      case "userStatusUpdated":
        return onUserStatusUpdated(push)
      case 'user_status_updated':
        return onUserStatusUpdated2(push)
      case "onTyping":
        return onTyping(push)
      default:
        return console.info("unhandled incoming push", push)
    }
  }

  function onClose(event: CloseEvent) {
    console.info(`websocket was closed: code=${event.code} reason=${event.reason}`)
    store.setNetwork("offline")
    timeout = setTimeout(connect, 1000)
    abortController.abort()
  }

  function onError(err: any) {
    console.error(err)
  }

  function onChatCreated(push: Push$ChatCreated) {
    store.setChat(push.payload.chat)
    store.setTimestamp(getTimestamp())
  }

  function onMessageSeen(push: Push$MessageSeen) {
    store.updateSeenTillMessageId(push.payload.chat_id, push.payload.user_id, push.payload.message_id)
    store.setTimestamp(getTimestamp())
  }

  function onMessageCreated(push: Push$MessageCreated) {
    const state = store.getState()
    const myId = state.tokenInfo && state.tokenInfo.entity_id
    const chatId = push.payload.chat_id
    const message = parseMessage(push.payload.message)

    if (message.author_id !== myId) {
      const author = state.agents[message.author_id]

      sound.play()

      if (author && !document.hidden) {
        notifications.show(author.name, {
          body: message.text,
          icon: author.avatar,
        }).then(function (notification) {
          notification.onclick = function () {
            window.focus()
            notification.close()
            setSelectedAgentId(message.author_id)
          }
        }).catch(function (err) {
          console.warn("fail to show notification", err)
        })
      }
    }

    store.appendMessages(chatId, [message])
    store.setTimestamp(message.ts)
    store.updateChat(chatId, {
      last_message_id: message.id,
      last_message_author_id: message.author_id,
      last_message_text: message.text,
      last_message_ts: message.ts,
    })
  }

  function onUserStatusUpdated(push: t.Push$UserStatusUpdated_DEPRECATED) {
    store.setUserStatus(parseUserStatus(push.payload))
    store.setTimestamp(getTimestamp())
  }

  function onUserStatusUpdated2(push: t.Push$UserStatusUpdated) {
    store.setUserStatus(parseUserStatus(push.payload.status))
    store.setTimestamp(push.payload.ts)
  }

  function onTyping(push: Push$OnTyping) {
    const state = store.getState()
    const myId = state.tokenInfo && state.tokenInfo.entity_id

    if (push.payload.user_id !== myId) {
      store.setTyping(push.payload.chat_id, push.payload.is_typing)
    }
  }

  /**
   * Methods
   */
  function syncMe() {
    return fetchTokenInfo(store.getAccessToken()).then(function (me) {
      store.setTokenInfo(me)
      storage.setTokenInfo(me)
    })
  }

  function syncAgents() {
    return api.listAgents(store.getAccessToken()).then(function (resp) {
      const agents = indexBy(resp, "id")

      store.setAgents(agents)
      storage.setAgents(agents)
    })
  }

  async function sendMessage() {
    const state = store.getState()

    if (!state.selectedAgent || !state.selectedAgent.agentId || !state.tokenInfo) {
      return
    }

    const agentId = state.selectedAgent.agentId
    const myId = state.tokenInfo.entity_id
    const text = String(state[`draft_${agentId}`] || "").trim()

    if (text.length === 0) {
      return
    }

    let chatId = state.selectedAgent ? state.selectedAgent.chatId : void 0

    if (!chatId) {
      const chats = Object.values(state.chats)
      const chatBetweenUsers = findChatBetweenUsers(chats, myId, agentId)

      if (chatBetweenUsers) {
        chatId = chatBetweenUsers.id
      }
    }

    if (!chatId) {
      await createChat({ user_id: state.selectedAgent.agentId }).then(function (chat) {
        chatId = chat.id

        store.setChat(chat)

        if (store.getSelectedAgentId() === agentId) {
          store.setSelectedAgentId(agentId, chatId)
        }
      })
    }

    if (!chatId) {
      return
    }

    const ts = getTimestamp()
    const messageId = -getRandomInt(1, 2147483647)
    const randomId = messageId
    const message: UI$Message = {
      id: messageId,
      notDelivered: true,
      deliveryError: "",
      random_id: randomId,
      text: text,
      author_id: state.tokenInfo.entity_id,
      ts: ts,
      date: new Date(ts * 1000)
    }

    store.appendMessages(chatId, [message])
    store.updateChat(chatId, {
      last_message_id: messageId,
      last_message_text: text,
      last_message_author_id: state.tokenInfo.entity_id,
      last_message_ts: ts,
    })

    store.setDraft(agentId, "")

    if (currReverseScroll) {
      currReverseScroll.scrollToBottom()
    }

    debouncedSetTyping.cancel()

    const [err] = await go(setTyping({
      chat_id: chatId,
      is_typing: false
    }))

    if (err) {
      console.warn(err)
    }

    await createMessage({
      chat_id: chatId,
      text: text,
      random_id: randomId
    }).then(function (resp) {
      if (!chatId) {
        return
      }

      store.updateMessage(chatId, messageId, {
        id: resp.id,
        notDelivered: false,
        ts: resp.ts,
      })
    }).catch(function (err) {
      if (!chatId) {
        return
      }

      store.updateMessage(chatId, messageId, {
        deliveryError: err.message
      })
    })
  }

  async function readChatMessages(chatId: number) {
    const myId = store.getMyId()
    const chat = store.getChat(chatId)
    const messages = store.getMessages(chatId)

    if (!chat || !messages || !myId) {
      return
    }

    const lastUnseenMessage = getLastUnseenMessage(chat, messages, myId)

    if (!lastUnseenMessage) {
      return
    }

    store.updateSeenTillMessageId(chatId, myId, lastUnseenMessage.id)

    return readMessages({
      chat_id: chatId,
      message_id: lastUnseenMessage.id,
    })
  }

  async function setSelectedAgentId(agentId: string) {
    const state = store.getState()
    const tokenInfo = state.tokenInfo

    if (!tokenInfo) {
      return console.warn("`state.tokenInfo` can't be empty")
    }

    const chats = Object.values(state.chats)
    const chat = findChatBetweenUsers(chats, tokenInfo.entity_id, agentId)

    store.setSelectedAgentId(agentId, chat ? chat.id : null)

    if (chat) {
      await syncMessages(chat.id)
    }

    debouncedSetTyping.cancel()
  }

  async function syncMessages(chatId: number) {
    const chatStatus = store.getChatStatus(chatId)

    if (chatStatus !== "incomplete") {
      return console.info(`syncMessages: chat status is not 'incomplete': ${chatStatus}`)
    }

    store.setChatStatus(chatId, "loading")

    const incomingMessages = await getMessages({
      chat_id: chatId,
      limit: 50,
      offset_id: 0
    })

    // reverve order from [id=3,id=2,id=1] to [id=1,id=2,id=3]
    incomingMessages.reverse()

    store.setChatStatus(chatId, "up-to-date")
    store.setMessages(chatId, incomingMessages)
  }

  async function setDraft(agentId: string, text: string, chatId: number) {
    store.setDraft(agentId, text)

    if (chatId) {
      await readChatMessages(chatId)

      debouncedSetTyping.cancel()
      debouncedSetTyping({
        chat_id: chatId,
        is_typing: text.length > 0
      })
    }
  }

  async function loadMoreMessages(chatId: number) {
    let messagesStatus = store.getMessagesStatus(chatId)

    if (messagesStatus === MessageStatus.Loading) {
      return // already loading
    }

    if (messagesStatus === MessageStatus.ReachedTail) {
      return // nothing to load more
    }

    store.setMessagesStatus(chatId, MessageStatus.Loading)

    let offset_id = 0
    let currMessages = store.getMessages(chatId)

    if (currMessages.length > 0) {
      offset_id = currMessages[0].id
    }

    const [err, messages] = await go(getMessages({
      chat_id: chatId,
      offset_id: offset_id,
      limit: 50
    }))

    if (err) {
      console.warn("fail to load more messages", err)
    }

    let nextMessageStatus = MessageStatus.Idle

    if (messages && messages.length === 0) {
      nextMessageStatus = MessageStatus.ReachedTail
    }

    if (messages && messages.length > 0) {
      messages.reverse() // reverse from [3,2,1] => [1, 2, 3]

      store.prependMessages(chatId, messages)
    }

    store.setMessagesStatus(chatId, nextMessageStatus)
  }

  function setReverseScroll(reverseScroll: IReverseScroll | null) {
    currReverseScroll = reverseScroll
  }

  function signIn(payload: t.Method$SignIn["payload"]) {
    return perform("sign_in", payload)
  }

  function readMessages(payload: t.Method$ReadMessages["payload"]) {
    return perform("readMessages", payload)
  }

  function getChats(payload: t.Method$GetChats["payload"]) {
    return perform("getChats", payload).then(parseChats)
  }

  function getUserStatuses(payload: t.Method$GetUserStatuses["payload"]) {
    return perform("getUserStatuses", payload).then(parseUserStatuses)
  }

  function createChat(payload: t.Method$CreateChat["payload"]) {
    return perform("createChat", payload).then(parseChat)
  }

  function getMessages(payload: t.Method$GetMessages["payload"]) {
    return perform("getMessages", payload).then(parseMessages)
  }

  function createMessage(payload: t.Method$CreateMessage["payload"]) {
    return perform<t.Method$CreateMessage>("createMessage", payload)
  }

  function setTyping(payload: t.Method$SetTyping["payload"]) {
    return perform("setTyping", payload)
  }

  function perform<T extends Methods>(action: T["method"], payload: T["payload"]): Promise<T["response"]> {
    if (!ws) {
      return Promise.reject(new Error("`ws` is not initialized"))
    }

    return ws.perform(action, payload)
  }

  /**
   * Parsers
   */

  function parseChats(chats: any): Public$Chat[] {
    return Array.isArray(chats) ? chats.map(parseChat) : []
  }

  function parseChat(chat: any): Public$Chat {
    return {
      id: Number(chat.id),
      user_a_id: String(chat.user_a_id),
      user_b_id: String(chat.user_b_id),
      seen_till_message_id_a: Number(chat.seen_till_message_id_a),
      seen_till_message_id_b: Number(chat.seen_till_message_id_b),
      last_message_id: Number(chat.last_message_id || 0),
      last_message_text: String(chat.last_message_text || ""),
      last_message_author_id: String(chat.last_message_author_id || ""),
      last_message_ts: Number(chat.last_message_ts || ""),
      ts: Number(chat.ts || 0),
    }
  }

  function parseMessages(messages: any) {
    return Array.isArray(messages) ? messages.map(parseMessage) : []
  }

  function parseMessage(message: any): UI$Message {
    return {
      id: Number(message.id),
      text: String(message.text),
      random_id: Number(message.random_id),
      author_id: String(message.author_id),
      ts: Number(message.ts),
      date: new Date(message.ts * 1000),
      notDelivered: false,
      deliveryError: "",
    }
  }

  function parseUserStatuses(statuses: any): Public$UserStatus[] {
    return Array.isArray(statuses) ? statuses.map(parseUserStatus) : []
  }

  function parseUserStatus(status: any): Public$UserStatus {
    return {
      user_id: String(status.user_id),
      status: String(status.status) as Public$UserStatus["status"],
      updated_at: Number(status.updated_at),
    }
  }
}

type IWebSocket = ReturnType<typeof createWebSocket>

function createWebSocket(urlSearchParams: URLSearchParams) {
  const requests = new Map()
  const host = location.hostname
  const url = `wss://${host}/direct/ws?${urlSearchParams}`
  const ws = new WebSocket(url)
  const pongTimeout = 10 * 1000 // 10s
  const requestRetries = 5
  let timer: any
  let interval: any
  let counter = 0
  let self = {
    perform: perform,
    onOpen(event: Event) { },
    onPush(push: Pushes) { },
    onClose(event: CloseEvent) { },
    onError(event: Event) { },
  }

  ws.onopen = onOpen
  ws.onclose = onClose
  ws.onerror = onError
  ws.onmessage = onMessage

  return self

  async function perform<T extends Methods>(action: T["method"], payload: T["payload"]): Promise<T["response"]> {
    for (let i = 0; i < requestRetries; i++) {
      const [err, resp] = await go(invoke(action, payload))

      if (!err) {
        return resp as T["response"]
      }

      if (err instanceof ErrorWithType && (
        err.type === "no_open_connection" ||
        err.type === "request_timeout" ||
        err.type === "too_many_requests"
      )) {
        await sleep(2000)
      }
      else if (err instanceof Error) {
        throw err
      }
    }

    throw new ErrorWithType("Fail to make a request", "max_retry_reached", 500)
  }

  function invoke(method: Methods["method"], payload: Methods["payload"]) {
    return new Promise(function (resolve, reject) {
      if (!ws) {
        return reject(new ErrorWithType("`ws` is not initialized", "no_open_connection", 500))
      }

      if (ws.readyState !== WebSocket.OPEN) {
        return reject(new ErrorWithType("`ws` is not connected", "no_open_connection", 500))
      }

      const error = new Error("Internal error")
      const requestId = ++counter
      const data = createData(method, payload, requestId)

      ws.send(data)
      requests.set(requestId, {
        resolve,
        reject,
        error
      })
    })
  }

  function onOpen(event: Event) {
    self.onOpen(event)
    interval = setInterval(ping, 5000);
  }

  function onClose(event: CloseEvent) {
    clearInterval(interval)
    clearTimeout(timer)

    for (const resolver of requests.values()) {
      resolver.error.message = "Request timeout"
      resolver.error.type = "request_timeout"
      resolver.error.status = 408
      resolver.reject(resolver.error)
    }

    requests.clear()
    self.onClose(event)
  }

  function onError(event: Event) {
    self.onError(event)
  }

  function onMessage(event: MessageEvent) {
    const data = parsePush(event.data)
    const resolver = requests.get(data.pushId)

    if (resolver) {
      if (data.status === 200) {
        resolver.resolve(data.payload)
      }
      else {
        const message = data.payload && data.payload.message || "Internal error";
        const type = data.payload && data.payload.type || "internal"

        resolver.reject(new ErrorWithType(message, type, data.status))
      }

      requests.delete(data.pushId)

    }
    else {
      self.onPush({
        push: data.push,
        payload: data.payload
      } as Pushes)
    }
  }

  function createData(method: Methods["method"], payload: Methods["payload"], requestId: number) {
    return JSON.stringify([method, payload, requestId])
  }

  function parsePush(data: any) {
    data = JSON.parse(data)

    if (!Array.isArray(data)) {
      throw new RangeError("Data has to be an array")
    }

    const [push, payload, pushId, status] = data

    return {
      push: String(push),
      payload: payload || {},
      pushId: pushId,
      status: Number(status)
    }
  }

  function noop() { }

  function ping() {
    perform("ping", {})
      .then(function () {
        clearTimeout(timer)
      })
      .catch(function () {
        terminate()
      })

    timer = setTimeout(terminate, pongTimeout)
  }

  function terminate() {
    ws.close()
  }
}

type IReverseScroll = ReturnType<typeof createReverseScroll>

function createReverseScroll(options: {
  scrollEl: HTMLElement,
  contentContainerEl: HTMLElement,
  onTopReached(): void
  onTopReachedThreshold: number
}) {
  const scrollEl = options.scrollEl;
  const contentContainerEl = options.contentContainerEl;
  const onTopReached = options.onTopReached || function () { }
  const onTopReachedThreshold = options.onTopReachedThreshold || 0.25
  const resizeObserver = new ResizeObserver(onContentResize)
  let lastContentContainerRect = contentContainerEl.getBoundingClientRect()
  let isStickyToBottom = true
  let isScrolling = false

  resizeObserver.observe(contentContainerEl)
  scrollEl.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  })

  return {
    dispose,
    scrollToBottom,
  }

  function dispose() {
    resizeObserver.unobserve(contentContainerEl)
    resizeObserver.disconnect()
    scrollEl.removeEventListener("scroll", onScroll)
  }

  function onContentResize(entries: ResizeObserverEntry[]) {
    for (let entry of entries) {
      let nextContentRect = entry.contentRect

      if (isStickyToBottom) {
        scrollToBottom()
      }
      else {
        if (lastContentContainerRect) {
          const heightDiff = Math.round(nextContentRect.height - lastContentContainerRect.height)

          if (heightDiff > 0) {
            scrollEl.scrollTop = scrollEl.scrollTop + heightDiff
          }
        }
      }

      lastContentContainerRect = nextContentRect
    }
  }

  function onScroll() {
    if (!isScrolling) {
      requestAnimationFrame(function () {
        checkScrollPosition()
        isScrolling = false
      })

      isScrolling = true
    }
  }

  function scrollToBottom() {
    scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight
  }

  function checkScrollPosition() {
    const scrollTop = scrollEl.scrollTop
    const scrollHeight = scrollEl.scrollHeight
    const clientHeight = scrollEl.clientHeight

    isStickyToBottom = scrollTop === scrollHeight - clientHeight

    if (scrollTop < clientHeight * onTopReachedThreshold) {
      onTopReached()
    }
  }
}

type IAutoResizer = ReturnType<typeof createAutoResizer>

function createAutoResizer(textarea: HTMLElement, maxHeight = 300) {
  textarea.setAttribute("style", "height:" + (textarea.scrollHeight) + "px; overflow-y: hidden;")
  textarea.addEventListener("input", onInput, false)
  textarea.addEventListener("change", onChange, false)
  textarea.addEventListener("keyup", onKeyUp, false)

  return { dispose }

  function dispose() {
    textarea.removeEventListener("input", onInput, false)
    textarea.removeEventListener("change", onChange, false)
    textarea.removeEventListener("keyup", onKeyUp, false)
  }

  function onInput() {
    resize()
  }

  function onChange() {
    resize()
  }

  function onKeyUp() {
    resize()
  }

  function resize() {
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px"
  }
}

function findChatBetweenUsers(chats: Public$Chat[], userAId: string, userBId: string) {
  for (const chat of chats) {
    if (chat.user_a_id === userAId && chat.user_b_id === userBId) {
      return chat
    }

    if (chat.user_a_id === userBId && chat.user_b_id === userAId) {
      return chat
    }
  }
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min) + min)
}

function indexBy<T>(items: T[], prop: keyof T) {
  const result: Record<string, T> = {}

  for (let i = 0; i < items.length; i++) {
    const key = items[i][prop]

    if (key != null) {
      // @ts-ignore
      result[key] = items[i]
    }
  }

  return result
}


function getDialogs(state: IState) {
  const myId = state.tokenInfo?.entity_id
  const chatsByUserIds = Object.values(state.chats)
    .reduce<Record<string, Public$Chat>>(function (acc, chat) {
      if (chat.user_a_id === myId) {
        acc[chat.user_b_id] = chat
      }
      else {
        acc[chat.user_a_id] = chat
      }

      return acc
    }, {})


  const agents = Object.values(state.agents)

  return agents
    .map(function (agent) {
      return {
        agent: agent,
        chat: chatsByUserIds[agent.id]
      }
    })
    .filter(function (value) {
      return Boolean(value.agent) && value.agent.id !== myId
    })
    .sort(function (a, b) {
      const aChat = a.chat
      const bChat = b.chat
      let aLastMessageCreatedAt = 0
      let bLastMessageCreatedAt = 0

      if (aChat && aChat.last_message_ts) {
        aLastMessageCreatedAt = aChat.last_message_ts
      }

      if (bChat && bChat.last_message_ts) {
        bLastMessageCreatedAt = bChat.last_message_ts
      }

      if (aLastMessageCreatedAt === bLastMessageCreatedAt) {
        return a.agent.name.localeCompare(b.agent.name)
      }

      return bLastMessageCreatedAt - aLastMessageCreatedAt
    })
}

type INotifications = ReturnType<typeof createNotifications>

function createNotifications() {
  return {
    getPermission,
    requestPermission,
    show,
  }

  function getPermission() {
    return Notification.permission
  }

  async function requestPermission() {
    return Notification.requestPermission()
  }

  async function show(title: string, options: NotificationOptions) {
    return new Notification(title, options)
  }
}

function formatUserStatus(status: Public$UserStatus) {
  if (status.status === "online") {
    return "online"
  }

  const lastSeen = Math.ceil(
    (Date.now() - status.updated_at) / 1000 / 60
  )

  if (lastSeen > 59) {
    return "last seen recently"
  }

  return `last seen ${lastSeen} ${lastSeen === 1 ? "minute" : "minutes"}`
}

function getUnseenMessagesCount(chat: Public$Chat, messages: Public$Message[], myId: string) {
  let maxMessageId
  let count = 0
  let i: number
  let message: t.Public$Message

  if (chat.user_a_id === myId) {
    maxMessageId = chat.seen_till_message_id_a
  }
  else {
    maxMessageId = chat.seen_till_message_id_b
  }

  for (i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]

    if (message.id <= maxMessageId) {
      break
    }

    // ignore my messages
    if (message.author_id !== myId) {
      count++
    }
  }

  return count
}

function getUnseenChatsCount(store: IAppStore) {
  const chats = Object.values(store.getChats())
  const myId = store.getMyId()
  let maxMessageId
  let count = 0
  let i = 0

  if (!myId) {
    return count
  }

  for (const chat of chats) {
    if (chat.user_a_id === myId) {
      maxMessageId = chat.seen_till_message_id_a
    }
    else {
      maxMessageId = chat.seen_till_message_id_b
    }

    const messages = store.getMessages(chat.id)

    if (!Array.isArray(messages)) {
      continue
    }

    for (i = messages.length - 1; i >= 0; i--) {
      let message = messages[i]

      if (message.id <= maxMessageId) {
        break
      }

      if (message.author_id !== myId) {
        count++
      }
    }
  }

  return count
}

/**
 * @unstable
 */
function getLastUnseenMessage(chat: Public$Chat, messages: Public$Message[], myId: string) {
  let lastSeenMessageId
  let message: t.Public$Message
  let i = 0

  if (chat.user_a_id === myId) {
    lastSeenMessageId = chat.seen_till_message_id_a
  }
  else {
    lastSeenMessageId = chat.seen_till_message_id_b
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    message = messages[i]

    if (message.author_id === myId) {
      continue
    }

    if (message.id > lastSeenMessageId) {
      return message
    }

    break
  }
}
type ISoundNotifications = ReturnType<typeof createSoundNotifications>

function createSoundNotifications(src: string) {
  let audio: HTMLAudioElement
  let isPlaying: boolean

  // enable audio only after interation with page
  document.addEventListener("click", onClick, false)

  return {
    play
  }

  function play() {
    if (!audio || audio.readyState < 2 || isPlaying) {
      return
    }

    isPlaying = true

    audio.play()
      .catch(function (err) {
        console.warn(err)
      })
      .finally(function () {
        isPlaying = false
      })
  }

  function onClick() {
    audio = new Audio(src)
    audio.onerror = (err) => console.warn("audio: error", err)
    document.removeEventListener("click", onClick, false)
  }
}

type IAppStorage = ReturnType<typeof createAppStorage>

function createAppStorage() {
  const chatsKey = "direct:chats:v2"
  const agentsKey = "direct:agents:v2"
  const tokenInfoKey = "direct:token_info:v2"
  const credentialsKey = "direct:credentials:v2"

  return {
    setAgents,
    getAgents,
    setChats,
    getChats,
    setTokenInfo,
    getTokenInfo,
    setCredentials,
    getCredentials,
    clear,
  }

  function setAgents(agents: Record<string, IAgent>) {
    return setItemSafely(agentsKey, JSON.stringify(agents))
  }

  function getAgents() {
    const agents = getItemSafely(agentsKey)

    if (typeof agents === "string") {
      return JSON.parse(agents) as Record<string, IAgent>
    }
  }

  function setChats(chats: Record<number, Public$Chat>) {
    return setItemSafely(chatsKey, JSON.stringify(chats))
  }

  function getChats() {
    const chats = getItemSafely(chatsKey)

    if (typeof chats === "string") {
      return JSON.parse(chats) as Record<number, Public$Chat>
    }
  }

  function setTokenInfo(tokenInfo: ITokenInfo) {
    return setItemSafely(tokenInfoKey, JSON.stringify(tokenInfo))
  }

  function getTokenInfo() {
    const tokenInfo = getItemSafely(tokenInfoKey)

    if (typeof tokenInfo === "string") {
      return JSON.parse(tokenInfo)
    }
  }

  function setCredentials(credentials: ICredentials) {
    return setItemSafely(credentialsKey, JSON.stringify(credentials))
  }

  function getCredentials() {
    let credentials = getItemSafely(credentialsKey)

    if (typeof credentials === "string") {
      return JSON.parse(credentials)
    }
  }

  function clear() {
    removeItemSafely(agentsKey)
    removeItemSafely(tokenInfoKey)
    removeItemSafely(credentialsKey)
  }

  function getItemSafely(key: string) {
    try {
      return localStorage.getItem(key)
    }
    catch (err) {
      console.warn("direct", err)
    }
  }

  function setItemSafely(key: string, value: string) {
    try {
      return localStorage.setItem(key, value)
    }
    catch (err) {
      console.warn("direct", err)
    }
  }

  function removeItemSafely(key: string) {
    try {
      return localStorage.removeItem(key)
    }
    catch (err) {
      console.warn("direct", err)
    }
  }
}

function createBadge() {
  let prevBadge: number = 0

  return { setBadge }

  function setBadge(nextBadge: number) {
    if (typeof nextBadge !== "number") {
      throw new RangeError("`badge` need to be a number, " + typeof nextBadge + " was passed")
    }

    if (prevBadge === nextBadge) {
      return
    }

    prevBadge = nextBadge

    if (!isFullScreenWidgetEnabled()) {
      return
    }

    window.fullscreenWidget.setNotificationBadge(nextBadge)
  }
}

function isFullScreenWidgetEnabled() {
  if (!window.fullscreenWidget) {
    return false
  }

  if (typeof window.fullscreenWidget.setNotificationBadge !== "function") {
    return false
  }

  return true
}

/** merge curr & incoming chats based on general update pattern */
function mergeChats(
  currentChatsMap: Record<number, Public$Chat>,
  incomingChats: Public$Chat[]
) {
  const mergedChats = Object.assign({}, currentChatsMap)

  for (const incomingChat of incomingChats) {
    mergedChats[incomingChat.id] = incomingChat
  }

  return mergedChats
}

function concatMessages(...args: UI$Message[][]) {
  const ids = new Set()
  const randomIds = new Set()
  const result = new Array()

  for (const messages of args) {
    for (const message of messages) {
      if (ids.has(message.id) || randomIds.has(message.random_id)) {
        continue
      }

      ids.add(message.id)
      randomIds.add(message.random_id)
      result.push(message)
    }
  }

  return result
}

/**
 * @example const [err, resp] = fetch("...")
 */
function go<T>(promise: Promise<T>) {
  return Promise.resolve(promise)
    .then(function (result) {
      return [null, result] as const
    })
    .catch(function (err) {
      return [err, null] as const
    })
}

function debounce(callback: Function, delay: number) {
  let timer: any

  if (typeof callback !== "function") {
    throw new RangeError("`callback` should be a function")
  }

  const debouncedCallback = function (...args: any) {
    clearTimeout(timer)

    timer = setTimeout(function () {
      callback(...args)
    }, delay)
  }

  debouncedCallback.cancel = function () {
    clearTimeout(timer)
  }

  return debouncedCallback
}

function sleep(ms: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

class ErrorWithType extends Error {

  constructor(message: string, public type: string, public status: number) {
    super(message)

    this.name = "ErrorWithType"
  }
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000)
}

namespace dateTime {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const SECONDS_IN_DAY = 60 * 60 * 24

  export function toLocalDate(d: Date) {
    const month = d.getMonth()
    const day = d.getDate().toString().padStart(2, "0")

    return `${months[month]} ${day}`
  }

  export function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
  }

  export function tsToDays(ts: number) {
    return Math.round(ts / SECONDS_IN_DAY)
  }

  export function formatTime(d: Date) {
    return d.toLocaleTimeString()
  }
}

function maybeLoadSentry() {
  if ((window as any).Sentry && typeof (window as any).Sentry.forceLoad === "function") {
    Sentry.forceLoad()
  }
}

function maybeAddBreadcrumb(options: Sentry.Breadcrumb) {
  if ((window as any).Sentry && typeof (window as any).Sentry.addBreadcrumb === "function") {
    Sentry.addBreadcrumb(options)
  }
}

function maybeSentrySetUser(user: Sentry.User) {
  if ((window as any).Sentry && typeof (window as any).Sentry.setUser === "function") {
    return (window as any).Sentry.setUser(user)
  }
}

function maybeCaptureException(err: Error, options?: Sentry.Options) {
  options = options || {}
  options.extra = options.extra || {}

  try {
    options.extra.err = JSON.stringify(err)
  }
  catch (_) { }

  if ((window as any).Sentry && typeof (window as any).Sentry.captureException === "function") {
    Sentry.captureException(err, options)
  }
  else {
    console.error("direct error", err, options)
  }
}
