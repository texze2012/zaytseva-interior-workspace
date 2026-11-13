import { PageHeader } from "@/components/PageHeader";
import { currentRelease, releases } from "@/lib/releases";

export default function UpdatesPage(){
 return <div className="content-page"><PageHeader eyebrow={`ВЕРСИЯ ${currentRelease.version}`} title="Что нового" subtitle="Новые возможности, улучшения и исправления рабочего пространства."/><div className="release-list">{releases.map((release,index)=><article className="section release-note" key={release.version}><header><span className="release-version">{release.version}{index===0?" · Текущая версия":""}</span><time dateTime={release.date}>{new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${release.date}T12:00:00Z`))}</time></header><h2>{release.title}</h2>{release.sections.map(section=><section key={section.title}><h3>{section.title}</h3><ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul></section>)}</article>)}</div></div>;
}
