/* globals twttr */
const m = require('mithril')
const dateFns = require('date-fns')
const qs = require('querystring')

const API_URL = 'https://api.bl0k.cz/1'

let opts = {}
let dataLoading = false
let data = {
  articles: [],
  important: [],
  chains: {}
}

function formatDate (input) {
  const d = new Date(input)
  const time = dateFns.format(d, 'HH:mm')

  let str = ''
  if (dateFns.isToday(d)) {
    str = time
  } else if (dateFns.isYesterday(d)) {
    str = `včera ${time}`
  } else {
    str = `${dateFns.format(d, 'd.M.')} ${time}`
  }
  return m('span', { title: dateFns.format(d, 'd.M.yyyy HH:mm') }, str)
}

function articleLink (item, text) {
  return m(m.route.Link, { href: `/zpravy/${item.id}/${item.slug}` }, text)
}

function loadData (refresh = false) {
  dataLoading = true
  if (refresh) {
    data.articles = []
    data.important = []
    m.redraw()
  }
  const query = {}
  if (opts.chain) {
    query.chain = opts.chain
  }
  m.request(`${API_URL}/articles?${qs.stringify(query)}`).then(out => {
    data = out
    m.redraw()
    dataLoading = false
    setTimeout(() => {
      twttr.widgets.load()
    }, 100)
  })
}

function reload () {
  loadData(true)
  return false
}

const Header = {
  view: () => {
    const menu = [
      { chainId: 'all', url: '/', chain: { name: 'Vše' } }
    ]
    for (const chainId of Object.keys(data.chains)) {
      menu.push({ chainId, chain: data.chains[chainId] })
    }
    return [
      m('h1.mx-5.text-left.text-xl', m(m.route.Link, { href: '/', style: 'font-family: monospace;', onclick: reload }, 'bl0k.cz')),
      m('.pl-5.text-sm', menu.map(mi => {
        return m(m.route.Link, { href: mi.url ? mi.url : `/chain/${mi.chainId}`, class: 'pr-3' }, (opts.chain === mi.chainId || (mi.chainId === 'all' && !opts.chain)) ? m('span.underline', mi.chain.name) : mi.chain.name)
      }))
      // m('p.text-sm', 'Rychlé zprávy z kryptoměn')
    ]
  }
}

const Feed = {
  view: () => {
    if (dataLoading) {
      return m('.p-5', 'Načítám obsah ...')
    }
    if (data.important.length === 0) {
      return m('.p-5', 'Nenalezeny žádné zprávy.')
    }
    return data.important.map(i => {
      return m('article.px-5.pt-5.pb-2', [
        m('div.font-bold.pb-2.text-sm', [
          m('span', articleLink(i, formatDate(i.date))),
          m('span.pl-3', i.topic)
        ]),
        m('.content', m.trust(i.html)),
        i.embed && i.embed.tweet && i.importantEmbed !== false ? m('div', [
          m('.pt-2', m.trust(i.embed.tweet))
        ]) : ''
      ])
    })
  }
}

const FeedBig = {
  view: () => {
    if (dataLoading) {
      return m('.p-5', 'Načítám obsah ...')
    }
    if (data.articles.length === 0) {
      return m('.p-5', 'Nenalezeny žádné zprávy.')
    }
    return data.articles.map(i => {
      return m('article.lg:flex.px-5.pt-5.pb-2', { id: i.id }, [
        m('.inline-block.lg:block.lg:w-1/6.text-sm.font-bold.leading-6.pr-2.pb-2', [
          m('.inline-block.lg:block', articleLink(i, formatDate(i.date))),
          m('.inline-block.lg:block.pl-3.lg:pl-0', i.topic)
        ]),
        m('.inline-block.lg:block.lg:w-5/6', [
          m('.content', [
            m.trust(i.html)
          ]),
          i.embed && i.embed.tweet ? m('div', [
            m('.pt-2', m.trust(i.embed.tweet))
          ]) : ''
        ])
      ])
    })
  }
}

const App = {
  oninit: (vnode) => {
    opts = vnode.attrs
    loadData()
  },
  onupdate: (vnode) => {
    console.log('opts:', opts)
    if (JSON.stringify(opts) !== JSON.stringify(vnode.attrs)) {
      opts = vnode.attrs
      loadData()
    }
  },
  view: (vnode) => {
    return [
      m('header.flex.h-12.bg-gray-100.items-center', m(Header)),
      m('section.absolute.left-0.right-0.bottom-0', { style: 'top: 3rem;' }, [
        m('section.absolute.top-0.bottom-0.left-0.w-full.lg:w-4/6', [
          m('div.absolute.inset-0', [
            m('div.absolute.inset-0.overflow-hidden', [
              m('div.absolute.inset-0.overflow-scroll', m(FeedBig, vnode.attrs))
            ])
          ])
        ]),
        m('section.absolute.inset-y-0.right-0.bg-gray-200.hidden.lg:block.w-2/6', [
          m('h2.p-5.font-bold.text-lg', 'Důležité zprávy'),
          m('div.overflow-hidden.absolute.left-0.right-0.bottom-0', { style: 'top: 3.5rem;' }, [
            m('div.overflow-scroll.absolute.inset-0.pb-10', m(Feed, vnode.attrs))
          ])
        ])
      ])
    ]
  }
}

const root = document.getElementById('app')
m.route(root, '/', {
  '/': App,
  '/chain/:chain': App
})
