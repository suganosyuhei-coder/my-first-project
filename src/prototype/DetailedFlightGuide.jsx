import React from 'react';
function Table({label,headers,rows}){return <table aria-label={label}>{headers&&<thead><tr>{headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead>}<tbody>{rows.map(([name,...values],rowIndex)=><tr key={rowIndex}><th scope="row">{name}</th>{values.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table>;}
export default function DetailedFlightGuide(){return <div className="proto-detailed-guide">
 <span className="proto-label">FLIGHT GUIDE / DETAILS</span><h2>詳しい操作・強化ガイド</h2>
 <h3>移動・スラスター操作</h3><Table label="詳しい移動操作" rows={[[<kbd key="shift">Shift</kbd>,'スラスター推進'],[<span key="drift"><kbd>Shift</kbd> ＋ <kbd>←</kbd> <kbd>→</kbd></span>,'スラスタードリフト']]}/>
 <h3>攻撃操作</h3><Table label="詳しい攻撃操作" rows={[[<kbd key="space">Space</kbd>,'通常弾を発射'],[<span key="charge"><kbd>Space</kbd> 長押し → 離す</span>,'チャージ攻撃を発射']]}/>
 <p>長くチャージするほど 攻撃が変化します</p><p className="proto-instructions-charge"><strong>① 波動砲 → ② 拡散波動砲 → ③ 拡散収束波動砲</strong></p>
 <h3>アイテムの回収と機体強化</h3><p>ビットが回収し 強化パーツを空き位置へ自動装着します<br/>取得時に機体も修復します</p>
 <h4>修理・回復アイテム</h4><Table label="詳しい回復アイテム" headers={['アイテム','効果']} rows={[
 ['金属板／ワイヤー',<>機体の損傷を修復<br/>金属板は岩からも入手できます</>],['水',<>氷を壊して入手し パイロットのVITALを回復<br/>通常の氷 ＋5 ／ 大きな氷塊 ＋8</>]]}/>
 <h4>強化パーツ</h4><Table label="詳しい強化パーツ" headers={['パーツ','基本効果','隣接ボーナス']} rows={[
 ['タンク','スラスター移動距離 ＋5%','＋0.5%'],['エンジン','推力 ＋5%','＋0.5%'],['射撃強化装置','射撃威力 ＋5%','＋0.5%'],['パネル',<>ダメージ軽減率 ＋3%<br/>通常チャージ速度 ＋3%</>,'各＋0.3%']]}/>
 <p>隣接ボーナスは上下左右に接する同種パーツのペアごとに加算します<br/>射撃強化はビットの攻撃には適用されません</p>
 <Table label="ミサイルパーツの詳細" rows={[["ミサイルパーツ",<>攻撃時に左右から追尾ミサイルを発射<br/>威力10 ／ 弾数無限<br/>2発が命中または自爆すると次を発射できます</>]]}/>
 <h3>PAWアーマー</h3><p>さまざまな種類があり 撃破すると強化パーツを入手できます</p><Table label="詳しいPAWアーマー" headers={['種類','入手方法','報酬・回復']} rows={[
 ['ミサイルPAW','撃破','ミサイルパーツ'],['緑PAW','接触',<>VITAL ＋12<br/>強化パーツ1個</>]]}/>
 </div>;}
