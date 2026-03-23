import { ReactNode } from "react";

export function Table({children}:{children:ReactNode}){return <table className="w-full text-left">{children}</table>}
export function TableHeader({children}:{children:ReactNode}){return <thead>{children}</thead>}
export function TableBody({children}:{children:ReactNode}){return <tbody>{children}</tbody>}
export function TableHead({children,className}:{children:ReactNode,className?:string}){return <th className={`px-3 py-2 ${className||''}`}>{children}</th>}
export function TableRow({children,className}:{children:ReactNode,className?:string}){return <tr className={`border-b border-white/10 ${className||''}`}>{children}</tr>}
export function TableCell({children,className}:{children:ReactNode,className?:string}){return <td className={`px-3 py-2 ${className||''}`}>{children}</td>}