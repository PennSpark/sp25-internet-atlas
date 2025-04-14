export default function LandingScreen() {
    return (
        <div
        style={{
            backgroundColor: 'black',
            color: 'white',
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingTop: '3rem',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '2rem',
            backgroundImage: 'url(/landing.svg)',
            backgroundPosition: 'center',
        }}>
            <h1>Internet Atlas</h1>
            <button>ENTER</button>
        </div>
    )
}