// script.js - 独立逻辑，使用 math.js 处理 CAS 功能
// 作者：针对小白移动端，注释详细，便于后期修改

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取输入框、结果显示区域
    const exprInput = document.getElementById('expression');
    const resultDiv = document.getElementById('result');
    const buttonGrid = document.getElementById('buttonGrid');

    // 用于存储变量的上下文（以便赋值像 "x=5" 后后续使用）
    const scope = {};

    // 辅助函数：向输入框追加文本（忽略光标位置，直接尾部追加，对小白友好）
    function appendToExpression(str) {
        exprInput.value += str;
        // 触发input事件，以便可能的实时计算（但这里仅手动）
        exprInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 清空输入框
    function clearExpression() {
        exprInput.value = '';
        // 同时清空结果提示（可选）
        resultDiv.innerText = '等待输入...';
    }

    // 退格：删除最后一个字符
    function backspace() {
        exprInput.value = exprInput.value.slice(0, -1);
    }

    // 核心：计算表达式数值（使用math.evaluate，并更新scope实现变量累积）
    function evaluateExpression() {
        const expr = exprInput.value.trim();
        if (expr === '') {
            resultDiv.innerText = '空表达式';
            return;
        }
        try {
            // 使用math.evaluate，传入scope引用，这样赋值语句如 "x=3" 会改变scope
            const result = math.evaluate(expr, scope);
            // 处理不同类型的结果显示
            if (typeof result === 'object' && result !== null) {
                // 可能是矩阵、复数等，转为字符串
                resultDiv.innerText = result.toString();
            } else {
                resultDiv.innerText = String(result);
            }
            // 可选：将计算结果保存到window.lastResult 供后续使用（但本设计无Ans，预留）
            window.lastResult = result;
        } catch (error) {
            resultDiv.innerText = '错误: ' + error.message;
        }
    }

    // CAS: 化简 simplify
    function simplifyExpression() {
        const expr = exprInput.value.trim();
        if (expr === '') return;
        try {
            // 注意：simplify 是符号计算，不依赖数值scope，但表达式可能包含变量
            const simplified = math.simplify(expr);
            resultDiv.innerText = simplified.toString();
        } catch (error) {
            resultDiv.innerText = '化简错误: ' + error.message;
        }
    }

    // CAS: 求导 (对变量x)
    function derivativeExpression() {
        const expr = exprInput.value.trim();
        if (expr === '') return;
        try {
            // 第二个参数为求导变量 'x'
            const derivative = math.derivative(expr, 'x');
            resultDiv.innerText = derivative.toString();
        } catch (error) {
            resultDiv.innerText = '求导错误: ' + error.message;
        }
    }

    // CAS: 展开 expand (math.js 提供 math.expand)
    function expandExpression() {
        const expr = exprInput.value.trim();
        if (expr === '') return;
        try {
            // 检查 expand 是否存在（高版本math.js均有）
            if (typeof math.expand === 'function') {
                const expanded = math.expand(expr);
                resultDiv.innerText = expanded.toString();
            } else {
                // 降级提示
                resultDiv.innerText = '当前math.js版本不支持expand，请升级';
            }
        } catch (error) {
            resultDiv.innerText = '展开错误: ' + error.message;
        }
    }

    // 处理按钮点击：事件代理（性能好，后期加按钮也无需重新绑定）
    buttonGrid.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn');  // 确保点击的是按钮
        if (!btn) return;

        // 1. 获取按钮的自定义属性优先 (data-action / data-value)
        const action = btn.getAttribute('data-action');
        const value = btn.getAttribute('data-value');

        // 2. 特殊功能按钮：action 优先处理
        if (action) {
            switch (action) {
                case 'clear':
                    clearExpression();
                    break;
                case 'backspace':
                    backspace();
                    break;
                case 'evaluate':
                    evaluateExpression();
                    break;
                case 'simplify':
                    simplifyExpression();
                    break;
                case 'derivative':
                    derivativeExpression();
                    break;
                case 'expand':
                    expandExpression();
                    break;
                default:
                    // 如果action未知，但可能有value? 一般不会
                    if (value) appendToExpression(value);
            }
            return;
        }

        // 3. 没有action，但有 data-value (数字、运算符、常数、函数等)
        if (value !== null && value !== undefined) {
            // 特殊映射：让界面的 "ln" 插入 "log(" (math.js中用log表示自然对数)
            // 界面按钮 "ln" 对应 data-value="log("  已在HTML中设定
            // 界面按钮 "log" 对应 data-value="log10(" 插入常用对数
            // 常数 π 和 e 直接插入 "pi" "e" (math.js识别)
            // 其他如 sin( 等直接插入
            appendToExpression(value);
            return;
        }

        // 4. 降级：如果没有任何data属性，就使用按钮.innerText (但为了统一，上面基本覆盖)
        // 此处作为后备，但一般不会触发
        const text = btn.innerText;
        // 排除特殊功能按钮再次误触 (但已经过action处理)
        if (text === 'C' || text === '⌫' || text === '=') return; 
        // 处理 "π" "e" 等显示文本与插入值不同的情况
        if (text === 'π') appendToExpression('pi');
        else if (text === 'e') appendToExpression('e');
        else if (text === 'ln') appendToExpression('log(');   // 自然对数
        else if (text === 'log') appendToExpression('log10('); // 常用对数
        else if (text === 'sin' || text === 'cos' || text === 'tan' || text === 'sqrt') {
            appendToExpression(text + '(');
        } else {
            // 数字、运算符、括号等直接使用文本
            appendToExpression(text);
        }
    });

    // 为输入框添加键盘回车支持 (可快捷计算)
    exprInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            evaluateExpression();
        }
    });

    // 初始示例：显示默认表达式的化简结果，让用户感受到CAS氛围
    setTimeout(() => {
        // 给个小例子：化简初始值 x^2+2x+1
        try {
            const initExpr = exprInput.value.trim();
            if (initExpr) {
                const simp = math.simplify(initExpr);
                resultDiv.innerText = '化简: ' + simp.toString();
            }
        } catch (e) {
            // 忽略
        }
    }, 200);
});