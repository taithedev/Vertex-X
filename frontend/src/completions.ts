import { snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

const options: Completion[] = [
 ...['and','break','do','else','elseif','end','false','for','function','if','in','local','nil','not','or','repeat','return','then','true','until','while'].map(label => ({ label, type: 'keyword' })),
 ...['assert','error','ipairs','next','pairs','pcall','print','select','tonumber','tostring','type','xpcall'].map(label => ({ label, type: 'function', detail: 'Lua' })),
 ...['math','string','table','coroutine','utf8'].map(label => ({ label, type: 'namespace', detail: 'Lua library' })),
 ...['game','workspace','script','Enum','Instance','Vector2','Vector3','Color3','UDim2','CFrame','task'].map(label => ({ label, type: 'variable', detail: 'Roblox Studio' })),
 snippetCompletion('if ${condition} then\n\t${}\nend', { label: 'ifblock', detail: 'if … then … end', type: 'keyword', boost: 5 }),
 snippetCompletion('for ${1:index} = ${2:1}, ${3:10} do\n\t${}\nend', { label: 'forloop', detail: 'numeric loop', type: 'keyword' }),
 snippetCompletion('for ${index}, ${value} in ipairs(${items}) do\n\t${}\nend', { label: 'foreach', detail: 'iterate a list', type: 'keyword' }),
 snippetCompletion('local function ${name}(${args})\n\t${}\nend', { label: 'functionblock', detail: 'local function', type: 'function' }),
 snippetCompletion('game:GetService("${service}")', { label: 'GetService', detail: 'Roblox Studio', type: 'method' }),
 snippetCompletion('Instance.new("${className}")', { label: 'newInstance', detail: 'Roblox Studio', type: 'function' }),
 snippetCompletion('print(${message})', { label: 'printvalue', detail: 'print a value', type: 'function' }),
];
export function luaCompletions(context: CompletionContext) {
 const node = syntaxTree(context.state).resolveInner(context.pos, -1);
 if (/comment|string/i.test(node.name)) return null;
 const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
 if (!word && !context.explicit) return null;
 return { from: word ? word.from : context.pos, options, validFor: /^[A-Za-z_][A-Za-z0-9_]*$/ };
}
