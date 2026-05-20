import { useEffect, useState } from "react";

function Controlled ({value: string, onChange: string}) {
    console.log("The value is", value);
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="controlled input"
    />
  );
}

function uncontrolled () {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const handleSubmit = () => {
        alert(inputRef.current?.value);
    };
    return (
        <>
      <input
        ref={inputRef}
        defaultValue="uncontrolled input"
        placeholder="uncontrolled input"
        />
      <button onClick={handleSubmit}>click me</button>
        </>)
}

function Smart (){
    const [users, setUsers] = useState([])
    useEffect(() => {
        setTimeout(() => {
            setUsers([])
        }, 1000)
    })
    return(
        <div className="">
            <h3>Smart User List</h3>
            {users.length === 0 ? <p>Loading... </p>: <Dumb users={users} />}
        </div>
    )
}

function Dumb ({users}: {users: string[]}) { 
    return (
        <ul>{users.map(user => <li key={user}>{user}</li>)}</ul>
    )

}