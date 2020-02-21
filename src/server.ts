import express from "express"
import got from "got"
import { Gauge, register } from "prom-client"
import xml2js from "xml2js"
import env from "./env"
import { parsePDUValueToNum } from "./utils"

const app = express()
const port = 3000

app.get("/", (req, res) => {
  res.send('Intellinet PDU exporter <br/><br/> <a href="/metrics">metrics</a>')
})

const curBanGauge = new Gauge({ name: "pdu_current_amperes", help: "status.htm curBan" })
const tempBanGauge = new Gauge({ name: "pdu_temperature_celsius", help: "status.htm tempBan" })
const humBanGauge = new Gauge({ name: "pdu_humidity_percentage", help: "status.htm humBan" })
// const statBanGauge = new Gauge({ name: "pdu_status", help: "status.htm statBan" })
const outletStatGauge = new Gauge({
  name: "pdu_outlet_status",
  help: "status.htm outletStat",
  labelNames: ["outlet"]
})

// Example response from http://<pdu_ip>/status.xml
// <response>
//   <cur0>0.1</cur0>
//   <stat0>normal</stat0>
//   <curBan>0.1</curBan>
//   <tempBan>27</tempBan>
//   <humBan>25</humBan>
//   <statBan>normal</statBan>
//   <outletStat0>off</outletStat0>
//   <outletStat1>on</outletStat1>
//   <outletStat2>on</outletStat2>
//   <outletStat3>on</outletStat3>
//   <outletStat4>on</outletStat4>
//   <outletStat5>on</outletStat5>
//   <outletStat6>on</outletStat6>
//   <outletStat7>on</outletStat7>
//   <userVerifyRes>0</userVerifyRes>
// </response>
interface ParsedPDUStatus {
  response: {
    [key: string]: [string]
  }
}

app.get("/metrics", async (req, res) => {
  const url = `http://${env.PDU_IP}${env.PDU_STATS_PATH}`
  const response = await got.get(url)

  const parser = new xml2js.Parser()
  const parsedXml: ParsedPDUStatus = await parser.parseStringPromise(response.body)

  const { curBan, tempBan, humBan } = parsedXml.response

  curBanGauge.set(parsePDUValueToNum(curBan))
  tempBanGauge.set(parsePDUValueToNum(tempBan))
  humBanGauge.set(parsePDUValueToNum(humBan))
  // statBanGauge.set(parsePDUValueToNum(statBan))

  const indexes = [...Array(8).keys()]
  indexes.forEach(index => {
    const [status] = parsedXml.response[`outletStat${index}`]
    outletStatGauge.set({ outlet: index }, status === "on" ? 1 : 0)
  })

  res.set("Content-Type", register.contentType)
  res.send(register.metrics())
})

app.listen(port, () => console.log(`Server started on http://localhost:${port}`))
