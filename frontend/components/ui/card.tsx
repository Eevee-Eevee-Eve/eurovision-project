import { ReactNode } from "react";

export function Card({children,className}:{children:ReactNode,className?:string}) {
  return <div className={`rounded-2xl bg-white/5 p-4 ${className||''}`}>{children}</div>;
}
export function CardHeader({children}:{children:ReactNode}) {
  return <div className="mb-4">{children}</div>;
}
export function CardContent({children,className}:{children:ReactNode,className?:string}) {
  return <div className={className}>{children}</div>;
}