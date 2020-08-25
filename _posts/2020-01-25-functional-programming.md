---
title: '자바스크립트로 알아보는 함수형 프로그래밍'
date: '2020-01-25'
tag: [Javascript]
---

## 함수형 프로그래밍

> 함수형 프로그래밍은 순수 함수들을 변수로 담아 여러 조합을 통해 만드는 프로그래밍이다.

### 순수 함수

- 부수 효과가 없는 '순수 함수'를 말한다.
- 인자로 받은 값을 변경시키지 않는다.
- 동일한 인자를 주면 평가 시점에 상관없이 항상 동일한 인자를 리턴한다.
- 모듈화 수준을 높여서 안정성과 생산성, 재사용성을 높인다.

```
예시
function add(a, b) {
 return a + b
}
```

### 일급 함수

- 변수로 담을 수 있는 함수
- 예시
  const f1 = function() {}
- 다른 함수에 인자로 보낼 수 있는 함수

### add_maker 함수

```
const add_maker = function(a) {
  return function() {
    return a + b
  }
}

const add10 = add_maker(10)

console.log(add10(20)) // 30
```

> 함수형 프로그래밍은 순수 함수들을 변수로 담아 여러 조합을 통해 만드는 프로그래밍이다.

```
예시
const f4() = function(f1(), f2(), f3()) {
  return f3(f1() + f2())
}

console.log(
  f4(
    function() { return 1 },
    function() { return 2 },
    function(a) { return a * a })) // 9
```

## 함수형으로 전환하기
