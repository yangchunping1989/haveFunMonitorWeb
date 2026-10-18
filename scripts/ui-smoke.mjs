import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.ADMIN_API_TARGET||''))throw new Error('Disposable integration backend required')
const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})})
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port)],{cwd:root,env:process.env,stdio:'ignore',windowsHide:true})
let browser
const shots=path.resolve(root,'../automation-tests/artifacts/admin-web')
try {
 let ready=false
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 if(!ready)throw new Error('Vite startup failed')
 await mkdir(shots,{recursive:true})
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],apiErrors=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('response',res=>{if(res.url().includes('/api/admin/')&&res.status()>=400&&!res.url().endsWith('/auth/me'))apiErrors.push(`${res.status()} ${new URL(res.url()).pathname}`)})
 await page.goto(`http://127.0.0.1:${port}`)
 await page.getByRole('heading',{name:'登录运营后台'}).waitFor()
 await page.screenshot({path:path.join(shots,'login.png'),fullPage:true})
 await page.locator('input[autocomplete="username"]').fill('probe-admin')
 await page.locator('input[autocomplete="current-password"]').fill('probe-password-2026')
 await page.getByRole('button',{name:'登录',exact:true}).click()
 await page.locator('.page h1').filter({hasText:'运营概览'}).waitFor()
 await page.waitForFunction(()=>!document.querySelector('.el-loading-mask'))
 await page.screenshot({path:path.join(shots,'overview.png'),fullPage:true})
 const focus=process.env.ADMIN_UI_FOCUS==='skills'
 const sections=focus?['技能分析']:['使用分析','用户建议','词条反馈','词库观察','自动任务','五子棋对战','技能分析','配装与对手']
 for(const name of sections){
  await page.locator('.sidebar nav').getByRole('link',{name,exact:false}).click()
  await page.locator('.page h1').filter({hasText:name}).waitFor()
  await page.waitForFunction(()=>!document.querySelector('.el-loading-mask'))
  if(name==='用户建议'){
   await page.getByRole('button',{name:'查看与处理',exact:true}).first().click()
   await page.locator('.suggestion-content').waitFor()
   await page.screenshot({path:path.join(shots,'suggestion.png'),fullPage:true})
   await page.locator('.el-drawer__close-btn').click()
   await page.locator('.el-drawer').waitFor({state:'hidden'})
  }
  if(name==='词库观察'){
   await page.getByText('变化记录',{exact:true}).click()
   await page.waitForFunction(()=>!document.querySelector('.el-loading-mask'))
   await page.screenshot({path:path.join(shots,'weights.png'),fullPage:true})
  }
  if(name==='五子棋对战'){
   await page.getByRole('row').filter({hasText:'黑方获胜'}).getByRole('button',{name:'回放',exact:true}).first().click()
   await page.locator('svg.board').waitFor()
   await page.getByRole('button',{name:'下一步',exact:true}).click()
   await page.screenshot({path:path.join(shots,'replay.png'),fullPage:true})
   await page.locator('.el-drawer__close-btn').click()
   await page.locator('.el-drawer').waitFor({state:'hidden'})
  }
  if(name==='技能分析'){
   await page.locator('.table-filters .el-select').first().click()
   await page.getByRole('option',{name:'测试',exact:true}).click()
   await page.getByText('无懈可击',{exact:true}).first().waitFor()
   if(await page.locator('tbody .el-table__row').count()!==60)throw new Error('All 30 skills by both sides must remain visible')
   await page.locator('.el-table__expand-icon').first().click()
   await page.getByText('成功生效',{exact:true}).waitFor()
   await page.evaluate(()=>window.scrollTo(0,0))
   await page.screenshot({path:path.join(shots,'skills.png'),fullPage:false})
  }
 }
 if(errors.length||apiErrors.length)throw new Error(JSON.stringify({errors,apiErrors}))
 console.log(focus?'ADMIN_UI_SKILLS_OK 30_skills_both_sides zero_samples stats_expand no_page_errors':'ADMIN_UI_SMOKE_OK login nine_pages suggestion_drawer weight_history svg_replay no_page_errors')
}finally{await browser?.close();server.kill()}
