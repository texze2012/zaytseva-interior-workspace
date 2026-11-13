"use client";
import { useEffect, useState, useCallback, useRef, SetStateAction } from "react";
import { useAuth } from "@/lib/auth";
export function useStoredState<T extends string>(name:string,initial:T){
 const {user}=useAuth();const key=`zi:filters:${user?.id||"guest"}:${name}`;const fallback=useRef(initial);
 const [value,setValue]=useState<T>(initial);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||"null");setValue(typeof saved==="string"?saved as T:fallback.current);}catch{setValue(fallback.current);}},[key]);
 const update=useCallback((next:SetStateAction<T>)=>{setValue(previous=>{const result=typeof next==="function"?next(previous):next;try{localStorage.setItem(key,JSON.stringify(result));}catch{}return result;});},[key]);
 return [value,update] as const;
}
