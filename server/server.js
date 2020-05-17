/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 3000
const server = express()

const { readFile, writeFile, unlink } = require('fs').promises

const setHeaders = (req, res, next) => {
  res.set('x-skillcrucial-user', 'c4c2b231-3584-497c-a4f8-e01c6ab87b86')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
}

const url = 'https://jsonplaceholder.typicode.com/users'

const saveFile = async (users) => {
  return writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const openFile = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
  .then((data) => JSON.parse(data))
  .catch(async () => {
    const { data: users } = await axios(url)
    await saveFile(users)
    return users
  })
}

server.use(cors())
server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())
server.use(setHeaders)


server.get('/api/v1/users', async (req, res) => {
  const users = await openFile()
  res.json(users)
})

server.post('/api/v1/users', async (req, res) => {
  const users = await openFile()
  const newUserBody = req.body
  const userLength = users[users.length - 1].id
  newUserBody.id = userLength + 1
  const newUser = [...users, newUserBody ]
  saveFile(newUser)
  res.json({ status: 'success', id: newUserBody.id })
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await openFile()
  const { userId } = req.params
  const newUserBody = req.body
  const newUsersArray = users.map((it) => (it.id === +userId ? Object.assign(it, newUserBody) : it))
  saveFile(newUsersArray)
  res.json({ status: 'success', id: userId })
})

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await openFile()
  const { userId } = req.params
  users.splice(Number(userId) -1, 1)
  saveFile(users)
  res.json({ status: 'success', id: Number(userId) })
})

server.delete('/api/v1/users', async (req, res) => {
  await unlink(`${__dirname}/test.json`)
  res.json({ status: 'ok' })
})



// server.post('/api/v1/users', async (req, res) => {
//   const allUsers = await readFile(`${__dirname}/users.json`, { encoding: 'utf8' }) // получили юзеров
//   const allUsersParse = JSON.parse(allUsers) // привели юзеров в формат для дальнейшей работы
//   const User = req.body // получили данные с сервера
//   const newUser = { id: (allUsersParse.length - 1 + 2), User } // собрали айди и нового юзера 
//   const allUsersSave = JSON.stringify([ ...allUsersParse, newUser ]) // собрали массив старых и нового юзера в массив
//   writeFile(`${__dirname}/newuser.json`, allUsersSave, { encoding: 'utf8' })  // сохранили нового юзера в общий файл
//   res.json({ status: 'success', id: newUser.id }) // отдаем ответ с айди юзера
// })


// server.get('/api/v1/users', async (req, res) => {
//   await readFile(`${__dirname}/users.json`, { encoding: 'utf8' })
//     .then((data) => {
//       res.send(JSON.parse(data))
//     })
//     .catch(async () => {
//       const text = await axios(url).then((users) => JSON.stringify(users.data))
//       writeFile(`${__dirname}/users.json`, text, { encoding: 'utf8' })
//       res.json(JSON.parse(text))
//     })
// })



// server.patch('/api/v1/users/:userId', async (req, res) => {
//   const allUsers = await readFile(`${__dirname}/users.json`, { encoding: 'utf8' }) // получили юзеров
//   const allUsersParse = JSON.parse(allUsers) // привели юзеров в формат для дальнейшей работы
//   const { userId } = req.params
//   const User = req.body // получили данные с сервера
//   const newUser = { id: (allUsersParse.length - 1 + 2), User } // собрали айди и нового юзера 
//   const allUsersSave = JSON.stringify([ ...allUsersParse, newUser ]) // собрали массив старых и нового юзера в массив
//   writeFile(`${__dirname}/newuserpatch.json`, allUsersSave, { encoding: 'utf8' })  // сохранили нового юзера в общий файл
//   res.json({ status: 'success', id: userId }) // отдаем ответ с айди юзера
// })




server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
